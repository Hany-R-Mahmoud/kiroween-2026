/**
 * GLSL ES 3.00 sources for the holo card (WebGL2 only, one pass, no libraries).
 *
 * Conventions the renderer must follow:
 * - The canvas covers the stage (the frame outline). `vUv` is stage UV with y down.
 * - Textures are premultiplied, NOT y-flipped, clamped, mipmapped: image row 0 is v = 0.
 * - The canvas context is premultiplied alpha; the shader writes premultiplied colour.
 * - Colours come from uniforms (read from --color-accent / --color-glow / --color-ink).
 * - Time comes from the caller (rAF timestamp). Randomness is a pure hash of position.
 *
 * Uniforms (all floats unless noted):
 *   sampler2D uBg, uSubject, uFrame
 *   vec2  uRes      canvas size in device px
 *   float uTime     seconds (0 when reduced)
 *   vec2  uTilt     motion state, -1..1 (0 when reduced)
 *   vec2  uLight    light position, -1..1 (fixed when reduced)
 *   float uReduced  1 when reduced motion, else 0
 *   float uSweep    sweep position, -0.9..0.9 during the one-time sweep, else 0
 *   float uSpin     spin angle in radians modulo a full turn (0 when reduced)
 *   vec3  uEmber1, uEmber2, uFog   colours (accent, glow, ink)
 *   vec4  uOutline  outline in art UV: x0/ART.w, y0/ART.h, w/ART.w, h/ART.h
 *   float uRadius   corner radius in stage-height units
 */

export const VERT = `#version 300 es
out vec2 vUv;
void main(){
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  vUv = vec2(p.x, 1. - p.y);
  gl_Position = vec4(p * 2. - 1., 0., 1.);
}`;

export const FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 o;
uniform sampler2D uBg, uSubject, uFrame;
uniform vec2 uRes, uTilt, uLight;
uniform float uTime, uReduced, uSweep, uRadius, uSpin;
uniform vec3 uEmber1, uEmber2, uFog;
uniform vec4 uOutline;

// Gold mask thresholds on frame luminance and warmth (r - b). Tuned in Verify.
#define L0 .36
#define L1 .56
#define W0 .09
#define W1 .21
#define SHINE 48.
#define ART_ASPECT 1.4

float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
float lumOf(vec3 c){ return dot(c, vec3(.299, .587, .114)); }
float vnoise(vec2 p){
  vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + 1.), f.x), f.y);
}
vec3 unp(vec4 c){ return c.rgb / max(c.a, 1e-3); }

// 48 embers: 8 lanes of 6. A pixel checks its own lane and the two neighbours.
vec3 embers(vec2 uv, float asp){
  vec3 c = vec3(0);
  float L = floor(uv.x * 8.);
  for (int di = -1; di <= 1; di++){
    float i = L + float(di);
    if (i < 0. || i > 7.) continue;
    for (int j = 0; j < 6; j++){
      float h = hash(vec2(i, float(j))), h2 = hash(vec2(h * 17., i + 3.));
      float ph = fract(uTime * (.025 + .03 * h2) + h);
      vec2 pos = vec2((i + .5) / 8. + (h2 - .5) * .1 + sin(uTime * .6 + h * 40.) * .012, 1.05 - ph * 1.1);
      float s = .0035 + .004 * hash(vec2(h2, h));
      vec2 d = (uv - pos) * vec2(asp, 1.);
      float q = dot(d, d);
      float g = exp(-q / (s * s)) + .15 * exp(-q / (s * s * 12.));
      g *= sin(3.14159 * ph) * (.6 + .4 * sin(uTime * 5. + h * 30.));
      c += g * mix(uEmber1, uEmber2, step(.5, h2));
    }
  }
  return c * mix(1., .5, uReduced);
}

void main(){
  vec2 uv = vUv;
  float asp = uRes.x / uRes.y;
  vec2 art = uOutline.xy + uv * uOutline.zw;
  // Layer travel in art UV: percent of card width, y scaled by the art aspect.
  vec2 unit = vec2(1., 1. / ART_ASPECT) * uOutline.z;

  // 1. Background: scaled 1.08, moves opposite to the tilt.
  vec2 bgUv = (art - .5 - uTilt * -.035 * unit) / 1.08 + .5;
  vec3 col = texture(uBg, bgUv).rgb;

  // 2. Fog in the bottom third.
  float fn = vnoise(uv * vec2(3., 4.) + vec2(uTime * .03, 0.)) * .65 + vnoise(uv * vec2(7., 9.) - vec2(uTime * .05, 0.)) * .35;
  col = mix(col, uFog, fn * smoothstep(.62, 1., uv.y) * .22);

  // 3. Embers.
  col += embers(uv, asp);

  // 4. Subject, +1 percent of card width at full tilt.
  vec4 sub = texture(uSubject, art - uTilt * .01 * unit);
  col = col * (1. - sub.a) + sub.rgb;

  // Inner shadow: ring taps of frame alpha, shadow falls onto the picture.
  vec2 px = 1. / vec2(textureSize(uFrame, 0));
  float sh = 0.;
  for (int k = 0; k < 8; k++){
    float a = float(k) * .785398;
    sh += texture(uFrame, art + (vec2(cos(a), sin(a)) * 1.8 + vec2(0., .6)) * vec2(1. / 1000., 1. / 1400.)).a;
  }
  col *= 1. - .45 * sh * .125;

  // 5. Frame and gold.
  vec4 f = texture(uFrame, art);
  vec3 fc = unp(f);
  float lum = lumOf(fc);
  float gold = smoothstep(L0, L1, lum) * smoothstep(W0, W1, fc.r - fc.b);
  vec2 e = px * 1.5;
  float lR = lumOf(unp(texture(uFrame, art + vec2(e.x, 0)))), lL = lumOf(unp(texture(uFrame, art - vec2(e.x, 0))));
  float lU = lumOf(unp(texture(uFrame, art - vec2(0, e.y)))), lD = lumOf(unp(texture(uFrame, art + vec2(0, e.y))));
  vec3 n = normalize(vec3(-(lR - lL) * 3., (lU - lD) * 3., 1.));
  vec3 Ld = normalize(vec3(uLight.x * .9, -uLight.y * .9, .6));
  vec3 H = normalize(Ld + vec3(0, 0, 1));
  float spec = pow(max(dot(n, H), 0.), SHINE) * smoothstep(.25, .6, lum);
  vec3 c = fc * mix(1., .8 + .4 * dot(n, Ld), gold) + spec * uEmber2 * gold * 1.2;

  // 6. Thin-film foil and sparkles, gold only.
  float tl = max(length(uTilt), abs(sin(uSpin)));
  float ph = dot(uv, vec2(1.3, .9)) + lum * 1.5 + dot(uTilt, vec2(.8, .6)) + uSpin * .5;
  c += (.5 + .5 * cos(6.28318 * (ph + vec3(0., .33, .67)))) * .12 * smoothstep(0., .15, tl) * gold;
  vec2 cell = art * 220.;
  float spk = step(.985, fract(hash(floor(cell)) + dot(uTilt, vec2(3.1, 2.3))));
  c += spk * smoothstep(.5, .1, length(fract(cell) - .5)) * gold * uEmber2 * (1. - uReduced);
  col = col * (1. - f.a) + c * f.a;

  // 7. Sweep, whole card, additive.
  float d = dot(uv - .5, normalize(vec2(1., -.6)));
  float pos = clamp(uTilt.x * .6 + uTilt.y * .4, -1., 1.) * .55 + uSweep + sin(uSpin) * .55;
  float on = max(smoothstep(0., .15, tl), step(1e-4, abs(uSweep)));
  col += exp(-pow((d - pos) / .12, 2.)) * .14 * on * uEmber2;

  // Outline mask (rounded rectangle), rim light, vignette.
  vec2 p = (uv - .5) * vec2(asp, 1.);
  vec2 q = abs(p) - (vec2(asp, 1.) * .5 - uRadius);
  float sd = length(max(q, 0.)) + min(max(q.x, q.y), 0.) - uRadius;
  float rim = smoothstep(-.003, 0., sd) * (.3 + .7 * max(dot(normalize(p + 1e-4), uLight), 0.));
  col += rim * .35 * uEmber2;
  col *= 1. - .18 * smoothstep(.4, .9, length(uv - .5) * 1.4);

  float mask = clamp(.5 - sd * uRes.y, 0., 1.);
  o = vec4(col * mask, mask);
}`;

/** Uniform names the renderer looks up. */
export const UNIFORMS = [
  'uBg', 'uSubject', 'uFrame', 'uRes', 'uTime', 'uTilt', 'uLight', 'uReduced',
  'uSweep', 'uSpin', 'uEmber1', 'uEmber2', 'uFog', 'uOutline', 'uRadius',
] as const;
export type UniformName = (typeof UNIFORMS)[number];
