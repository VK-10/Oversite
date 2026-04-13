/**
 * src/components/GlobeThree/shaders.ts
 *
 * Raw GLSL source strings for the two shader pairs used by the globe:
 *   - Atmosphere glow (ATMO)
 *   - Fibonacci dot cloud (DOT)
 *
 * Kept separate so the main component file doesn't scroll through shader code.
 */

/* ── Atmosphere ─────────────────────────────────────────────────────── */

export const ATMO_VERT = /* glsl */ `
varying vec3 vNormal;
void main() {
  vNormal = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

export const ATMO_FRAG = /* glsl */ `
varying vec3 vNormal;
uniform vec3  glowColor;
uniform float coeff;
uniform float power;
void main() {
  float intensity = pow(coeff - dot(vNormal, vec3(0,0,1)), power);
  gl_FragColor = vec4(glowColor * intensity, intensity);
}`;

/* ── Fibonacci dot cloud ─────────────────────────────────────────────── */

export const DOT_VERT = /* glsl */ `
attribute float vis;
varying   float vVis;
void main() {
  vVis = vis;
  gl_PointSize = 1.8;
  gl_Position  = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

export const DOT_FRAG = /* glsl */ `
varying float vVis;
uniform vec3 col;
void main() {
  if (vVis < 0.5) discard;
  float d = length(gl_PointCoord - 0.5);
  if (d > 0.5) discard;
  gl_FragColor = vec4(col, 0.5 - d);
}`;