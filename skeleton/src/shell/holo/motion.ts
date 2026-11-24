import {
  ARROW_IDLE_MS,
  ARROW_STEP_DEG,
  DRAG_THRESHOLD_PX,
  DRAG_TILT_MAX_DEG,
  SPIN_FRICTION,
  SPIN_MAX_VELOCITY,
  SPIN_SETTLE_BELOW,
  SPIN_SETTLE_SPRING,
  TILT_MAX_DEG,
} from './geometry.ts';

/**
 * Motion controller for the holo card.
 *
 * Two independent states: the hover tilt (spring) and the free spin around the
 * vertical axis (drag, inertia, settle, arrow steps). One pointer handler and
 * one shared rAF loop. The loop also drives the WebGL renderer: a renderer
 * registers a `draw(state, time, spinDeg)` callback and is called once per
 * running frame, after the CSS variables are written.
 *
 * No ambient randomness or wall clock: time is the rAF timestamp or
 * `event.timeStamp`. No `deviceorientation` or `devicemotion`.
 */

/** Tilt state in normalised units. x is in [-1, 1]; y may reach DRAG_TILT_MAX_DEG / TILT_MAX_DEG while dragging. */
export interface TiltState {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export type Face = 'front' | 'back';
export type RendererKind = 'html' | 'webgl';
export type SpinMode = 'rest' | 'drag' | 'inertia' | 'settle' | 'step';

/** Spin around the vertical axis. `angle` has no limit. */
export interface SpinState {
  angle: number;
  velocity: number;
  mode: SpinMode;
  target: number;
}

export interface RendererHandle {
  /** Called once per running frame with the tilt, the rAF time in seconds and the spin angle in degrees. */
  draw: (state: Readonly<TiltState>, time: number, spinDeg: number) => void;
  /** True while the renderer needs frames on its own (sweep, embers, pending update). */
  isAnimating?: () => boolean;
}

export interface MotionController {
  readonly state: Readonly<TiltState>;
  readonly spin: Readonly<SpinState>;
  /** Registers the renderer callback. Returns the function that removes it. */
  registerRenderer: (renderer: RendererHandle) => () => void;
  setReduced: (reduced: boolean) => void;
  /** Turns the card to the face at `index * 180` degrees. */
  turnTo: (index: number) => void;
  /** Turns by `delta` half turns from the settled face. */
  turnBy: (delta: number) => void;
  /** Asks for one more frame (resize, texture update). */
  requestFrame: () => void;
  destroy: () => void;
}

export const STIFFNESS = 170;
export const DAMPING = 24;
export const MAX_DT = 1 / 30;
export { DRAG_THRESHOLD_PX };
/** Pointer idle time in ms after which the loop drops to every second frame. */
export const IDLE_MS = 1000;
/** Spring is settled below this sum of |position| error and |velocity|. */
export const SETTLE_EPSILON = 0.002;
/** Time constant of the release velocity estimate, in ms. */
const VELOCITY_TAU_MS = 60;
/** A pointer that rested longer than this before release gives zero velocity, in ms. */
const STALE_MS = 80;

const clamp = (v: number, lo: number, hi: number): number =>
  v < lo ? lo : v > hi ? hi : v;

/** Largest tilt y while dragging, in normalised units (20 / 12). */
const DRAG_TILT_Y = DRAG_TILT_MAX_DEG / TILT_MAX_DEG;

/**
 * Pure spring step. Semi-implicit Euler, `dt` in seconds, clamped to 1/30 s.
 * Returns a new state; inputs are not modified.
 */
export function step(
  state: Readonly<TiltState>,
  target: Readonly<{ x: number; y: number }>,
  dt: number,
): TiltState {
  const h = clamp(dt, 0, MAX_DT);
  const vx = state.vx + (STIFFNESS * (target.x - state.x) - DAMPING * state.vx) * h;
  const vy = state.vy + (STIFFNESS * (target.y - state.y) - DAMPING * state.vy) * h;
  return { x: state.x + vx * h, y: state.y + vy * h, vx, vy };
}

/** True when the state is at rest on the target. */
export function isSettled(
  state: Readonly<TiltState>,
  target: Readonly<{ x: number; y: number }>,
): boolean {
  return (
    Math.abs(state.x - target.x) +
      Math.abs(state.y - target.y) +
      Math.abs(state.vx) +
      Math.abs(state.vy) <
    SETTLE_EPSILON
  );
}

/** Idle sway target from the rAF time in seconds. About ±2 degrees. */
export function swayTarget(seconds: number): { x: number; y: number } {
  return { x: Math.sin(seconds * 0.35) * 0.18, y: Math.cos(seconds * 0.27) * 0.14 };
}

/** Tilt in degrees for a normalised value. */
export const toDegrees = (v: number): number => v * TILT_MAX_DEG;

/** Face shown when the spin rests at `angle`: even half turns are the front. */
export function faceOf(angle: number): Face {
  const index = Math.round(angle / 180);
  return index % 2 === 0 ? 'front' : 'back';
}

/** Nearest multiple of 180 degrees. */
export const nearestFace = (angle: number): number => Math.round(angle / 180) * 180;

/**
 * Pure settle spring step toward `target`. Returns the new angle and velocity,
 * and whether the motion has ended (the angle is then exactly the target).
 */
export function spinSpring(
  angle: number,
  velocity: number,
  target: number,
  dt: number,
): { angle: number; velocity: number; done: boolean } {
  const h = clamp(dt, 0, MAX_DT);
  const v = velocity + (SPIN_SETTLE_SPRING.stiffness * (target - angle) - SPIN_SETTLE_SPRING.damping * velocity) * h;
  const a = angle + v * h;
  if (Math.abs(a - target) < 0.05 && Math.abs(v) < 1) return { angle: target, velocity: 0, done: true };
  return { angle: a, velocity: v, done: false };
}

export interface MotionOptions {
  scene: HTMLElement;
  /** Element that receives `--tx`, `--ty`, `--px` and `--py` (`.holo-tilt`). */
  tilt: HTMLElement;
  /** Element that receives `--spin` (`.holo-flip`). */
  flip: HTMLElement;
  reduced: boolean;
  /** Called only when the spin returns to rest, with the face that is now settled. */
  onSettle: (face: Face) => void;
  /** Called when a drag passes the threshold and on every `turnTo` / `turnBy`. */
  onInteract?: () => void;
}

export function createMotion(options: MotionOptions): MotionController {
  const { scene, tilt, flip, onSettle, onInteract } = options;

  let state: TiltState = { x: 0, y: 0, vx: 0, vy: 0 };
  const spin: SpinState = { angle: 0, velocity: 0, mode: 'rest', target: 0 };
  let reduced = options.reduced;
  let renderer: RendererHandle | null = null;

  let onScreen = true;
  let documentVisible = typeof document === 'undefined' ? true : !document.hidden;

  let pointerActive = false;
  const pointerTarget = { x: 0, y: 0 };
  let dragTiltY = 0;

  // Press tracking (press to release).
  let pressId: number | null = null;
  let pressX = 0;
  let pressY = 0;
  let dragged = false;
  let grab = false;
  let swallowClick = false;
  let dragAngle0 = 0;
  let dragX0 = 0;
  let degPerPx = 0;
  let lastMoveTs = 0;

  // Arrow steps: `event.timeStamp` of the last step (same clock as the rAF timestamp).
  let lastStepAt = 0;

  // Idle tracking uses rAF timestamps only.
  let activityPending = true;
  let lastActivity = 0;
  let skipToggle = false;

  let dirty = true;
  let rafId = 0;
  let lastTs: number | null = null;
  let destroyed = false;
  let spinning = false;

  const currentTarget = (seconds: number): { x: number; y: number } => {
    if (reduced) return { x: 0, y: 0 };
    // The vertical-axis rotation belongs to the spin while it runs.
    if (spin.mode === 'drag') return { x: 0, y: dragTiltY };
    if (spin.mode !== 'rest') return { x: 0, y: 0 };
    return pointerActive ? pointerTarget : swayTarget(seconds);
  };

  // Frames stop on the back face at rest. A spin start restarts them.
  const canRun = (): boolean =>
    onScreen &&
    documentVisible &&
    !destroyed &&
    !(spin.mode === 'rest' && faceOf(spin.angle) === 'back');

  const isAnimating = (seconds: number): boolean =>
    dirty ||
    spin.mode !== 'rest' ||
    !reduced ||
    !isSettled(state, currentTarget(seconds)) ||
    (renderer?.isAnimating?.() ?? false);

  const write = (): void => {
    tilt.style.setProperty('--tx', state.x.toFixed(4));
    tilt.style.setProperty('--ty', state.y.toFixed(4));
    // Parallax and shader inputs use the tilt clamped to [-1, 1].
    tilt.style.setProperty('--px', clamp(state.x, -1, 1).toFixed(4));
    tilt.style.setProperty('--py', clamp(state.y, -1, 1).toFixed(4));
  };

  const writeSpin = (): void => {
    flip.style.setProperty('--spin', `${spin.angle.toFixed(3)}deg`);
    const now = spin.mode !== 'rest';
    if (now !== spinning) {
      spinning = now;
      if (now) scene.setAttribute('data-spinning', 'true');
      else scene.removeAttribute('data-spinning');
    }
  };

  const stop = (): void => {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
    lastTs = null;
  };

  const ensure = (): void => {
    if (rafId || !canRun()) return;
    rafId = requestAnimationFrame(frame);
  };

  const markActivity = (): void => {
    activityPending = true;
    skipToggle = false;
    ensure();
  };

  /** Ends the spin on `angle` (a multiple of 180) and reports the settled face. */
  const finish = (angle: number): void => {
    spin.angle = angle;
    spin.target = angle;
    spin.velocity = 0;
    spin.mode = 'rest';
    writeSpin();
    dirty = true;
    onSettle(faceOf(angle));
  };

  const startSettle = (): void => {
    spin.target = nearestFace(spin.angle);
    spin.mode = 'settle';
    markActivity();
  };

  function frame(ts: number): void {
    rafId = 0;
    if (!canRun()) {
      lastTs = null;
      return;
    }

    if (activityPending) {
      lastActivity = ts;
      activityPending = false;
    }

    // After 1 s without activity, skip every second frame. Never while the spin runs.
    if (spin.mode === 'rest' && ts - lastActivity > IDLE_MS) {
      skipToggle = !skipToggle;
      if (skipToggle) {
        rafId = requestAnimationFrame(frame);
        return;
      }
    }

    const seconds = ts / 1000;
    const dt = lastTs === null ? 1 / 60 : (ts - lastTs) / 1000;
    lastTs = ts;

    // Spin first, so the tilt target already follows the new mode.
    let finished: number | null = null;
    if (spin.mode === 'inertia') {
      const h = clamp(dt, 0, MAX_DT);
      spin.velocity *= Math.exp(-SPIN_FRICTION * h);
      spin.angle += spin.velocity * h;
      if (Math.abs(spin.velocity) < SPIN_SETTLE_BELOW) {
        spin.target = nearestFace(spin.angle);
        spin.mode = 'settle';
      }
    } else if (spin.mode === 'settle' || spin.mode === 'step') {
      if (spin.mode === 'step' && ts - lastStepAt >= ARROW_IDLE_MS) {
        spin.target = nearestFace(spin.angle);
        spin.mode = 'settle';
      }
      const next = spinSpring(spin.angle, spin.velocity, spin.target, dt);
      spin.angle = next.angle;
      spin.velocity = next.velocity;
      if (next.done && spin.mode === 'settle') finished = next.angle;
    }

    const target = currentTarget(seconds);
    state = step(state, target, dt);
    if (isSettled(state, target)) state = { x: target.x, y: target.y, vx: 0, vy: 0 };

    if (finished !== null) {
      finish(finished);
    } else {
      writeSpin();
    }
    write();
    renderer?.draw(state, seconds, spin.angle);
    dirty = false;

    if (isAnimating(seconds)) {
      rafId = requestAnimationFrame(frame);
    } else {
      lastTs = null;
    }
  }

  // --- pointer ---------------------------------------------------------------

  const aim = (event: PointerEvent): void => {
    const rect = scene.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    pointerTarget.x = clamp(((event.clientX - rect.left) / rect.width) * 2 - 1, -1, 1);
    pointerTarget.y = clamp(((event.clientY - rect.top) / rect.height) * 2 - 1, -1, 1);
    dragTiltY = clamp(pointerTarget.y * DRAG_TILT_Y, -DRAG_TILT_Y, DRAG_TILT_Y);
    pointerActive = true;
    markActivity();
  };

  const release = (): void => {
    pointerActive = false;
    markActivity();
  };

  const capture = (id: number): void => {
    try {
      scene.setPointerCapture(id);
    } catch {
      // Capture can fail if the pointer is already gone. Dragging still works inside the card.
    }
  };

  const onPointerDown = (event: PointerEvent): void => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    dragged = false;
    swallowClick = false;
    grab = false;
    pressId = event.pointerId;
    pressX = event.clientX;
    pressY = event.clientY;
    if (event.pointerType === 'touch') capture(event.pointerId);
    // A press during motion stops the card where it is (grab).
    if (!reduced && spin.mode !== 'rest') {
      grab = true;
      spin.velocity = 0;
      spin.mode = 'drag';
      spin.target = spin.angle;
    }
    aim(event);
  };

  const onPointerMove = (event: PointerEvent): void => {
    if (pressId === event.pointerId) {
      if (!dragged) {
        if (Math.hypot(event.clientX - pressX, event.clientY - pressY) > DRAG_THRESHOLD_PX) {
          dragged = true;
          onInteract?.();
          if (!reduced) {
            // Start without a jump: the angle is measured from where the threshold was crossed.
            const rect = scene.getBoundingClientRect();
            degPerPx = rect.width > 0 ? 180 / rect.width : 0;
            dragAngle0 = spin.angle;
            dragX0 = event.clientX;
            lastMoveTs = event.timeStamp;
            spin.velocity = 0;
            spin.mode = 'drag';
            if (event.pointerType !== 'touch') capture(event.pointerId);
          }
        }
      } else if (!reduced && spin.mode === 'drag') {
        // Physical pointer direction: the same in LTR and RTL (the card is a fixed painted image).
        const next = dragAngle0 + (event.clientX - dragX0) * degPerPx;
        const dtMs = event.timeStamp - lastMoveTs;
        if (dtMs > 0) {
          const inst = ((next - spin.angle) / dtMs) * 1000;
          const alpha = 1 - Math.exp(-dtMs / VELOCITY_TAU_MS);
          spin.velocity += alpha * (inst - spin.velocity);
          lastMoveTs = event.timeStamp;
        }
        spin.angle = next;
      }
    }
    aim(event);
  };

  const endPress = (event: PointerEvent, cancelled: boolean): void => {
    if (pressId !== event.pointerId) return;
    pressId = null;
    if (scene.hasPointerCapture?.(event.pointerId)) scene.releasePointerCapture(event.pointerId);
    if (spin.mode === 'drag') {
      const stale = event.timeStamp - lastMoveTs > STALE_MS;
      const v = dragged && !stale ? clamp(spin.velocity, -SPIN_MAX_VELOCITY, SPIN_MAX_VELOCITY) : 0;
      if (Math.abs(v) < SPIN_SETTLE_BELOW) {
        spin.velocity = 0;
        startSettle();
      } else {
        spin.velocity = v;
        spin.mode = 'inertia';
        markActivity();
      }
    }
    swallowClick = !cancelled && (dragged || grab);
    dragged = false;
    grab = false;
  };

  const onPointerUp = (event: PointerEvent): void => {
    endPress(event, false);
    if (event.pointerType === 'touch') release();
  };

  const onPointerLeave = (event: PointerEvent): void => {
    // Mid-drag the pointer is captured, so leave only fires once it is released.
    if (pressId === event.pointerId && spin.mode !== 'drag') pressId = null;
    release();
  };

  const onPointerCancel = (event: PointerEvent): void => {
    endPress(event, true);
    release();
  };

  /** Swallows the click that follows a drag or a grab so it never flips the card or opens the link. */
  const onClickCapture = (event: MouseEvent): void => {
    if (!swallowClick) return;
    swallowClick = false;
    event.preventDefault();
    event.stopPropagation();
  };

  // --- keyboard --------------------------------------------------------------

  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (reduced || spin.mode === 'drag') return;
    event.preventDefault();
    // Visual direction, never read from `dir`: ArrowRight moves the near surface to the right.
    const dir = event.key === 'ArrowRight' ? 1 : -1;
    const base = spin.mode === 'step' ? spin.target : spin.angle;
    if (spin.mode === 'inertia') spin.velocity = 0;
    spin.target = base + dir * ARROW_STEP_DEG;
    spin.mode = 'step';
    lastStepAt = event.timeStamp;
    markActivity();
  };

  // --- turning ---------------------------------------------------------------

  const turnTo = (index: number): void => {
    if (destroyed || spin.mode === 'drag') return;
    onInteract?.();
    if (reduced) {
      // No rotation: change the settled face at once. The report comes on the next frame for the crossfade.
      spin.angle = index * 180;
      spin.target = spin.angle;
      spin.velocity = 0;
      spin.mode = 'rest';
      writeSpin();
      requestAnimationFrame(() => {
        if (destroyed || spin.mode !== 'rest') return;
        finish(spin.angle);
        ensure();
      });
      return;
    }
    spin.target = index * 180;
    spin.velocity = 0;
    spin.mode = 'settle';
    markActivity();
  };

  // --- visibility ------------------------------------------------------------

  const onVisibility = (): void => {
    documentVisible = !document.hidden;
    if (documentVisible) {
      dirty = true;
      ensure();
      return;
    }
    // rAF does not run while hidden: jump to the settle target so focus and inert state stay correct.
    if (spin.mode !== 'rest') {
      const end = spin.mode === 'settle' || spin.mode === 'step' ? nearestFace(spin.target) : nearestFace(spin.angle);
      pressId = null;
      dragged = false;
      grab = false;
      finish(end);
    }
    stop();
  };

  let observer: IntersectionObserver | null = null;
  if (typeof IntersectionObserver !== 'undefined') {
    observer = new IntersectionObserver((entries) => {
      const last = entries[entries.length - 1];
      if (!last) return;
      onScreen = last.isIntersecting;
      if (onScreen) {
        dirty = true;
        ensure();
      } else {
        stop();
      }
    });
    observer.observe(scene);
  }

  scene.addEventListener('pointerdown', onPointerDown);
  scene.addEventListener('pointermove', onPointerMove);
  scene.addEventListener('pointerup', onPointerUp);
  scene.addEventListener('pointerleave', onPointerLeave);
  scene.addEventListener('pointercancel', onPointerCancel);
  scene.addEventListener('click', onClickCapture, true);
  scene.addEventListener('keydown', onKeyDown);
  document.addEventListener('visibilitychange', onVisibility);

  ensure();

  return {
    get state() {
      return state;
    },
    get spin() {
      return spin;
    },
    registerRenderer(next) {
      renderer = next;
      dirty = true;
      ensure();
      return () => {
        if (renderer === next) renderer = null;
      };
    },
    setReduced(next) {
      if (reduced === next) return;
      reduced = next;
      if (reduced && spin.mode !== 'rest') {
        // Snap to the nearest face. The report comes on the next frame.
        pressId = null;
        dragged = false;
        grab = false;
        const end = nearestFace(spin.angle);
        spin.angle = end;
        spin.target = end;
        spin.velocity = 0;
        spin.mode = 'rest';
        writeSpin();
        requestAnimationFrame(() => {
          if (destroyed || spin.mode !== 'rest') return;
        finish(spin.angle);
        ensure();
        });
      }
      dirty = true;
      markActivity();
    },
    turnTo,
    turnBy(delta) {
      turnTo(Math.round(spin.angle / 180) + delta);
    },
    requestFrame() {
      dirty = true;
      ensure();
    },
    destroy() {
      destroyed = true;
      stop();
      renderer = null;
      observer?.disconnect();
      scene.removeAttribute('data-spinning');
      scene.removeEventListener('pointerdown', onPointerDown);
      scene.removeEventListener('pointermove', onPointerMove);
      scene.removeEventListener('pointerup', onPointerUp);
      scene.removeEventListener('pointerleave', onPointerLeave);
      scene.removeEventListener('pointercancel', onPointerCancel);
      scene.removeEventListener('click', onClickCapture, true);
      scene.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('visibilitychange', onVisibility);
    },
  };
}
