import { ART, OUTLINE, OUTLINE_SIZE } from './geometry.ts';
import type { MotionController, TiltState } from './motion.ts';
import { FRAG, UNIFORMS, VERT } from './shader.ts';
import type { UniformName } from './shader.ts';

/**
 * WebGL2 renderer for the holo card. Lazy chunk: loaded with `import()` after
 * the HTML renderer has painted.
 *
 * - One canvas, one full-screen triangle, one fragment shader (see shader.ts).
 * - Textures come from the `<img>` elements already in the DOM. No fetch and no
 *   createImageBitmap(url), so the CSP (`connect-src 'self'`) is never involved.
 *   A tainted or unloaded image makes the upload fail, and `createHoloRenderer`
 *   returns `null` so the HTML renderer stays.
 * - Frames are driven by `motion.ts`; this module only draws when asked.
 * - No ambient randomness or wall clock: time is the rAF timestamp.
 */

export interface HoloRendererOptions {
  /** `.holo-scene`: receives `data-renderer`, observed for size. */
  scene: HTMLElement;
  /** Front face (the clipped box that holds the art). The canvas is added inside it. */
  host: HTMLElement;
  images: { background: HTMLImageElement; subject: HTMLImageElement; frame: HTMLImageElement };
  motion: MotionController;
  reduced: boolean;
  /** Delay in ms before the one-time sweep starts. Default 0. */
  sweepDelayMs?: number | undefined;
  /** Called once if the renderer is destroyed by an error or by context loss. */
  onFailure?: (reason: 'context-lost' | 'error') => void;
}

export interface HoloRenderer {
  setReduced: (reduced: boolean) => void;
  destroy: () => void;
}

/** Fixed light position used when reduced motion is on (one still lit frame). */
const REDUCED_LIGHT = { x: -0.45, y: -0.55 } as const;
const SWEEP_SECONDS = 1.4;
const SWEEP_RANGE = 0.9;
const MAX_FRAME_DT = 1 / 30;

function compile(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function link(gl: WebGL2RenderingContext): WebGLProgram | null {
  const vs = compile(gl, gl.VERTEX_SHADER, VERT);
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
  const program = gl.createProgram();
  if (!vs || !fs || !program) {
    if (vs) gl.deleteShader(vs);
    if (fs) gl.deleteShader(fs);
    if (program) gl.deleteProgram(program);
    return null;
  }
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return null;
  }
  return program;
}

/** Uploads one loaded `<img>` as a premultiplied, mipmapped, clamped texture. */
function upload(
  gl: WebGL2RenderingContext,
  unit: number,
  image: HTMLImageElement,
): WebGLTexture | null {
  if (!image.complete || image.naturalWidth === 0) return null;
  const texture = gl.createTexture();
  if (!texture) return null;
  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
  try {
    // Throws SecurityError when the image is cross-origin without CORS approval.
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, image);
  } catch {
    gl.deleteTexture(texture);
    return null;
  }
  if (gl.getError() !== gl.NO_ERROR) {
    gl.deleteTexture(texture);
    return null;
  }
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return texture;
}

/** Resolves a CSS custom property colour to linear-free sRGB floats in 0..1. */
function readColor(scene: HTMLElement, property: string): [number, number, number] {
  const probe = document.createElement('span');
  probe.style.color = `var(${property})`;
  probe.style.display = 'none';
  scene.appendChild(probe);
  const css = getComputedStyle(probe).color;
  probe.remove();
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext('2d');
    if (ctx && css) {
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = css;
      ctx.fillRect(0, 0, 1, 1);
      const d = ctx.getImageData(0, 0, 1, 1).data;
      return [d[0]! / 255, d[1]! / 255, d[2]! / 255];
    }
  } catch {
    // Fall through to the neutral value.
  }
  return [1, 1, 1];
}

const smooth = (t: number): number => t * t * (3 - 2 * t);

export function createHoloRenderer(options: HoloRendererOptions): HoloRenderer | null {
  const { scene, host, images, motion } = options;
  let reduced = options.reduced;

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('webgl2', {
    alpha: true,
    premultipliedAlpha: true,
    antialias: false,
    powerPreference: 'low-power',
  });
  if (!context) return null;
  const gl: WebGL2RenderingContext = context;

  const program = link(gl);
  if (!program) return null;

  const textures: WebGLTexture[] = [];
  const layers = [images.background, images.subject, images.frame];
  for (let i = 0; i < layers.length; i++) {
    const texture = upload(gl, i, layers[i]!);
    if (!texture) {
      for (const t of textures) gl.deleteTexture(t);
      gl.deleteProgram(program);
      return null;
    }
    textures.push(texture);
  }

  const locations = {} as Record<UniformName, WebGLUniformLocation | null>;
  for (const name of UNIFORMS) locations[name] = gl.getUniformLocation(program, name);

  gl.useProgram(program);
  gl.disable(gl.BLEND);
  gl.disable(gl.DEPTH_TEST);
  gl.uniform1i(locations.uBg, 0);
  gl.uniform1i(locations.uSubject, 1);
  gl.uniform1i(locations.uFrame, 2);
  const accent = readColor(scene, '--color-accent');
  const glow = readColor(scene, '--color-glow');
  const ink = readColor(scene, '--color-ink');
  gl.uniform3f(locations.uEmber1, accent[0], accent[1], accent[2]);
  gl.uniform3f(locations.uEmber2, glow[0], glow[1], glow[2]);
  gl.uniform3f(locations.uFog, ink[0], ink[1], ink[2]);
  gl.uniform4f(
    locations.uOutline,
    OUTLINE.x0 / ART.w,
    OUTLINE.y0 / ART.h,
    OUTLINE_SIZE.w / ART.w,
    OUTLINE_SIZE.h / ART.h,
  );

  // --- canvas ----------------------------------------------------------------
  canvas.className = 'holo-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  const style = canvas.style;
  // Hidden until a complete frame has been drawn and presented, so the HTML layers are never uncovered.
  style.visibility = 'hidden';
  style.position = 'absolute';
  style.inset = '0';
  style.inlineSize = '100%';
  style.blockSize = '100%';
  style.display = 'block';
  style.pointerEvents = 'none';
  const art = host.querySelector('.holo-art');
  if (art) art.after(canvas);
  else host.prepend(canvas);

  let destroyed = false;
  // 'none' until the first full frame is drawn; 'pending' while waiting for it to be presented; 'shown' after the swap.
  let swap: 'none' | 'pending' | 'shown' = 'none';
  let rafA = 0;
  let rafB = 0;
  let waitingVisible = false;
  let sweepElapsed = 0;
  let sweepDelayLeft = Math.max(0, options.sweepDelayMs ?? 0) / 1000;
  let sweepDone = reduced;
  let lastTime: number | null = null;

  const resize = (): void => {
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    const dpr = Math.min(window.devicePixelRatio || 1, coarse ? 1 : 1.5);
    const w = Math.max(1, Math.round(host.clientWidth * dpr));
    const h = Math.max(1, Math.round(host.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    gl.viewport(0, 0, w, h);
    gl.uniform2f(locations.uRes, w, h);
    // Corner radius of the clipped face, in stage-height units.
    const radiusPx = parseFloat(
      getComputedStyle(host).getPropertyValue('border-start-start-radius'),
    );
    const radius = Number.isFinite(radiusPx) && host.clientHeight > 0 ? radiusPx / host.clientHeight : 0.02;
    gl.uniform1f(locations.uRadius, radius);
  };

  const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => {
    if (destroyed) return;
    resize();
    motion.requestFrame();
  });
  resizeObserver?.observe(host);
  resize();

  // --- teardown --------------------------------------------------------------
  let unregister: (() => void) | null = null;

  const onContextLost = (event: Event): void => {
    event.preventDefault();
    teardown();
    options.onFailure?.('context-lost');
  };

  function teardown(): void {
    if (destroyed) return;
    destroyed = true;
    cancelAnimationFrame(rafA);
    cancelAnimationFrame(rafB);
    document.removeEventListener('visibilitychange', onVisibility);
    unregister?.();
    unregister = null;
    resizeObserver?.disconnect();
    canvas.removeEventListener('webglcontextlost', onContextLost);
    scene.removeAttribute('data-renderer');
    canvas.remove();
    if (!gl.isContextLost()) {
      for (const t of textures) gl.deleteTexture(t);
      gl.deleteProgram(program);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    }
  }

  canvas.addEventListener('webglcontextlost', onContextLost);

  // A frame drawn while hidden may never be presented. When the page becomes visible, draw again.
  function onVisibility(): void {
    if (destroyed || document.hidden || !waitingVisible) return;
    waitingVisible = false;
    document.removeEventListener('visibilitychange', onVisibility);
    swap = 'none';
    motion.requestFrame();
  }

  const waitForVisible = (): void => {
    swap = 'none';
    if (waitingVisible) return;
    waitingVisible = true;
    document.addEventListener('visibilitychange', onVisibility);
  };

  /** Presented = two animation frames after the draw. Then the canvas shows, and the HTML art hides one frame later. */
  const present = (): void => {
    if (document.hidden) {
      waitForVisible();
      return;
    }
    swap = 'pending';
    rafA = requestAnimationFrame(() => {
      rafB = requestAnimationFrame(() => {
        if (destroyed) return;
        if (document.hidden) {
          waitForVisible();
          return;
        }
        canvas.style.visibility = 'visible';
        rafA = requestAnimationFrame(() => {
          if (destroyed) return;
          swap = 'shown';
          scene.setAttribute('data-renderer', 'webgl');
        });
      });
    });
  };

  // --- draw ------------------------------------------------------------------
  const draw = (state: Readonly<TiltState>, time: number, spinDeg: number): void => {
    if (destroyed) return;
    try {
      const dt = lastTime === null ? 0 : Math.min(Math.max(time - lastTime, 0), MAX_FRAME_DT);
      lastTime = time;

      let sweep = 0;
      if (!reduced && !sweepDone) {
        if (sweepDelayLeft > 0) {
          sweepDelayLeft -= dt;
          sweep = -SWEEP_RANGE; // same off-card start value the sweep has at t = 0
        } else {
          sweepElapsed += dt;
          const t = sweepElapsed / SWEEP_SECONDS;
          if (t >= 1) sweepDone = true;
          else sweep = (smooth(t) * 2 - 1) * SWEEP_RANGE;
        }
      }

      gl.uniform1f(locations.uTime, reduced ? 0 : time);
      gl.uniform1f(locations.uReduced, reduced ? 1 : 0);
      gl.uniform1f(locations.uSweep, sweep);
      if (reduced) {
        gl.uniform2f(locations.uTilt, 0, 0);
        gl.uniform1f(locations.uSpin, 0);
        gl.uniform2f(locations.uLight, REDUCED_LIGHT.x, REDUCED_LIGHT.y);
      } else {
        // The drag tilt can exceed 1 on y; the shader inputs stay in [-1, 1].
        const tx = Math.min(Math.max(state.x, -1), 1);
        const ty = Math.min(Math.max(state.y, -1), 1);
        gl.uniform2f(locations.uTilt, tx, ty);
        gl.uniform2f(locations.uLight, tx, ty);
        // Spin angle modulo a full turn, in radians.
        gl.uniform1f(locations.uSpin, (((spinDeg % 360) + 360) % 360) * (Math.PI / 180));
      }
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      if (swap === 'none') {
        if (gl.getError() !== gl.NO_ERROR) throw new Error('holo draw failed');
        present();
      }
    } catch {
      teardown();
      options.onFailure?.('error');
    }
  };

  unregister = motion.registerRenderer({
    draw,
    isAnimating: () => !destroyed && !reduced && !sweepDone,
  });

  return {
    setReduced(next) {
      if (destroyed || reduced === next) return;
      reduced = next;
      if (next) sweepDone = true;
      motion.requestFrame();
    },
    destroy: teardown,
  };
}
