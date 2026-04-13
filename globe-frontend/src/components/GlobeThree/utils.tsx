/**
 * src/components/GlobeThree/utils.ts
 *
 * Pure math helpers for converting between geographic coordinates
 * (longitude / latitude) and Three.js Vector3 positions on the sphere.
 */

import * as THREE from "three";

/**
 * Longitude + latitude → a point on the surface of a sphere of radius `r`.
 * Uses the standard spherical-coordinates convention where:
 *   phi  = polar angle from the +Y axis  (90° - lat)
 *   lambda = azimuthal angle around Y    (-lng, so East is positive X)
 */
export function ll2v(lng: number, lat: number, r: number): THREE.Vector3 {
  const phi = THREE.MathUtils.degToRad(90 - lat);
  const lam = THREE.MathUtils.degToRad(-lng);
  return new THREE.Vector3(
    r * Math.sin(phi) * Math.cos(lam),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(lam),
  );
}

/**
 * A point on the sphere → `{ lat, lng }` in degrees.
 * Inverse of ll2v — used to convert a raycaster hit-point
 * back to geographic coordinates for country lookup.
 */
export function v2ll(v: THREE.Vector3): { lat: number; lng: number } {
  const lat = 90 - THREE.MathUtils.radToDeg(Math.acos(v.y / v.length()));
  const lng = -THREE.MathUtils.radToDeg(Math.atan2(v.z, v.x));
  return { lat, lng };
}