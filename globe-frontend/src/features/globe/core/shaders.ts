export const atmosphereVertexShader = `
varying vec3 vNormal;

void main() {
  vNormal = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const atmosphereFragmentShader = `
varying vec3 vNormal;

void main() {
  float intensity = pow(0.6 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 4.0);
  gl_FragColor = vec4(0.50, 1.00, 0.80, intensity);
}
`;

export const pointVertexShader = `
attribute float vis;
varying float vVis;

void main() {
  vVis = vis;
  gl_PointSize = 1.6;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const pointFragmentShader = `
varying float vVis;

void main() {
  if (vVis < 0.5) discard;

  float d = length(gl_PointCoord - vec2(0.5));
  if (d > 0.5) discard;

  gl_FragColor = vec4(0.647, 0.953, 0.788, 0.45 - d);
}
`;