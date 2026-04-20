/**
 * src/components/GlobeThree/builders.ts
 *
 * Factory functions that create reusable Three.js objects.
 * None of these depend on React.
 *
 * Optimisations vs. original:
 *  - buildGrid writes directly to Float32Array instead of allocating
 *    129 × THREE.Vector3 objects per line (26 lines = ~3 350 objects saved).
 *  - sin/cos values that repeat across inner loop iterations are hoisted.
 */

import * as THREE from "three";
import worldIndiaUltra from "@amcharts/amcharts4-geodata/worldIndiaUltra";
import { DOT_VERT, DOT_FRAG } from "./shaders";
import { ll2v } from "./utils";

/* ── Shared border materials ─────────────────────────────────────────── */

/**
 * Module-level singletons shared across all border lines.
 * Do NOT dispose these in cleanup — they survive for the lifetime of the app
 * and are reused on remount.
 */
function makeBorderMat(color: number, opacity: number): THREE.LineBasicMaterial {
  return new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity,
    stencilWrite: false,
    stencilFunc: THREE.NotEqualStencilFunc,
    stencilRef: 1,
  });
}

export const DEFAULT_MAT  = makeBorderMat(0x00ff88, 0.85);
export const SELECTED_MAT = makeBorderMat(0xffffff, 1.0);
export const DIM_MAT      = makeBorderMat(0x00ff88, 0.25);

/* ── Lat/lng grid ─────────────────────────────────────────────────────── */

/**
 * Builds the lat/lng reference grid.
 *
 * Optimised: writes positions directly into a Float32Array buffer
 * instead of constructing a temporary THREE.Vector3[] array.
 * Saves ~3 350 object allocations (129 pts × 26 lines) at startup.
 */
export function buildGrid(R: number): THREE.Group {
  const g   = new THREE.Group();
  const dim = new THREE.LineBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.07 });
  const eq  = new THREE.LineBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.20 });

  const SEG = 128; // segments per line
  const PTS = SEG + 1;

  // Latitude circles
  for (let lat = -80; lat <= 80; lat += 20) {
    const phi    = THREE.MathUtils.degToRad(lat);
    const cosPhi = Math.cos(phi);
    const sinPhi = Math.sin(phi);
    const buf    = new Float32Array(PTS * 3);

    for (let i = 0; i < PTS; i++) {
      const lam    = (i / SEG) * Math.PI * 2;
      buf[i * 3]     = R * cosPhi * Math.cos(lam);
      buf[i * 3 + 1] = R * sinPhi;
      buf[i * 3 + 2] = R * cosPhi * Math.sin(lam);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(buf, 3));
    g.add(new THREE.Line(geo, lat === 0 ? eq : dim));
  }

  // Longitude meridians
  for (let lng = 0; lng < 360; lng += 20) {
    const lam    = THREE.MathUtils.degToRad(lng);
    const cosLam = Math.cos(lam);
    const sinLam = Math.sin(lam);
    const buf    = new Float32Array(PTS * 3);

    for (let i = 0; i < PTS; i++) {
      const phi    = (i / SEG) * Math.PI * 2 - Math.PI;
      const cosPhi = Math.cos(phi);
      buf[i * 3]     = R * cosPhi * cosLam;
      buf[i * 3 + 1] = R * Math.sin(phi);
      buf[i * 3 + 2] = R * cosPhi * sinLam;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(buf, 3));
    g.add(new THREE.Line(geo, dim));
  }

  return g;
}

/* ── Fibonacci dot cloud ─────────────────────────────────────────────── */

export function buildDots(R: number, n = 9_000): THREE.Points {
  const pos = new Float32Array(n * 3);
  const vis = new Float32Array(n);

  for (let i = 0; i < n; i++) {
    const phi   = Math.acos(1 - 2 * (i + 0.5) / n);
    const theta = Math.PI * (1 + Math.sqrt(5)) * i;
    pos[i * 3]     = R * Math.sin(phi) * Math.cos(theta);
    pos[i * 3 + 1] = R * Math.cos(phi);
    pos[i * 3 + 2] = R * Math.sin(phi) * Math.sin(theta);
    vis[i] = Math.random() > 0.4 ? 1 : 0;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("vis",      new THREE.BufferAttribute(vis, 1));

  return new THREE.Points(
    geo,
    new THREE.ShaderMaterial({
      vertexShader:   DOT_VERT,
      fragmentShader: DOT_FRAG,
      transparent:    true,
      depthWrite:     false,
      blending:       THREE.AdditiveBlending,
      uniforms: { col: { value: new THREE.Color(0x00ff88) } },
    })
  );
}

/* ── Country borders ─────────────────────────────────────────────────── */

export interface BorderResult {
  group:    THREE.Group;
  lineMap:  Map<string, THREE.Line[]>;
  features: GeoJSON.Feature[];
}

export async function buildBorders(R: number): Promise<BorderResult> {
  const group    = new THREE.Group();
  const lineMap  = new Map<string, THREE.Line[]>();
  const features: GeoJSON.Feature[] = [];

  const data        = worldIndiaUltra as any;
  const geoFeatures = (data.features ?? []) as GeoJSON.Feature[];

  for (const feature of geoFeatures) {
    const name: string =
      (feature.properties?.name as string) ?? String(feature.id);

    const geometry = feature.geometry;
    // FIX: Narrow the type to ensure .coordinates exists
    if (!geometry || (geometry.type !== "Polygon" && geometry.type !== "MultiPolygon")) {
      continue;
    }

    const coords =
      geometry.type === "Polygon"
        ? [geometry.coordinates]
        : geometry.coordinates;

    const lines: THREE.Line[] = [];

    (coords as number[][][][]).forEach((polygon) => {
      polygon.forEach((ring) => {
        const pts = ring.map(([lng, lat]) => ll2v(lng, lat, R));
        if (pts.length >= 2) {
          const line = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints(pts),
            DEFAULT_MAT,
          );
          lines.push(line);
          group.add(line);
        }
      });
    });

    if (lines.length) lineMap.set(name, lines);
    features.push(feature);
  }

  return { group, lineMap, features };
}

/* ── Starfield ───────────────────────────────────────────────────────── */

export function makeStars(n = 2_500): THREE.Points {
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n * 3; i++) {
    pos[i] = (Math.random() - 0.5) * 90;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  return new THREE.Points(
    geo,
    new THREE.PointsMaterial({
      color: 0xffffff, size: 0.055,
      transparent: true, opacity: 0.5,
      blending: THREE.AdditiveBlending,
    })
  );
}

/* ── Country centroids ───────────────────────────────────────────────── */

export interface Centroid {
  lat: number;
  lng: number;
}

/**
 * Averages the [lng, lat] pairs of a single polygon ring.
 * Good enough approximation for centering the camera on a country.
 */
function ringCentroid(ring: number[][]): Centroid {
  let sumLng = 0;
  let sumLat = 0;
  for (const [lng, lat] of ring) {
    sumLng += lng;
    sumLat += lat;
  }
  return { lat: sumLat / ring.length, lng: sumLng / ring.length };
}

/**
 * Builds a Map from country name → centroid {lat, lng}.
 *
 * For MultiPolygon features (e.g. USA, Russia, France), the outer ring of
 * the largest polygon — measured by vertex count — is used as a proxy for
 * the main landmass. This avoids placing the centroid inside Alaska,
 * Kaliningrad, or French Guiana instead of the primary territory.
 *
 * Called once after buildBorders resolves. The result is stored in
 * GlobeThree's centroidMapRef and used by the jump-to-country animation.
 */
export function buildCentroidMap(
  features: GeoJSON.Feature[],
): Map<string, Centroid> {
  const map = new Map<string, Centroid>();

  for (const feature of features) {
    const name: string =
      (feature.properties?.name as string) ?? String(feature.id);
    const geometry = feature.geometry;

    // FIX: Guard against null or non-polygon types
    if (!geometry || (geometry.type !== "Polygon" && geometry.type !== "MultiPolygon")) {
      continue;
    }

    let bestRing: number[][] = [];

    if (geometry.type === "Polygon") {
      // Outer ring is always index 0
      bestRing = (geometry.coordinates as number[][][])[0];
    } else if (geometry.type === "MultiPolygon") {
      // Pick the polygon whose outer ring has the most vertices
      let maxLen = 0;
      for (const polygon of geometry.coordinates as number[][][][]) {
        const outer = polygon[0];
        if (outer.length > maxLen) {
          maxLen    = outer.length;
          bestRing  = outer;
        }
      }
    }

    if (bestRing.length > 0) {
      map.set(name, ringCentroid(bestRing));
    }
  }

  return map;
}

/* ── Land fill ───────────────────────────────────────────────────────── */

/**
 * Renders land polygons as a THREE.Mesh by painting them onto a 2D canvas
 * in equirectangular projection and applying that as a texture to a sphere.
 *
 * WHY THE OLD TRIANGULATION APPROACH FAILED:
 * Any flat triangle in 3D whose vertices are on a sphere dips below the
 * sphere surface at its interior — by R·(1 - cos(θ/2)) per edge of arc θ.
 * Earcut's triangles can span large diagonal distances across a country
 * (e.g. north-to-south Russia), not just along the boundary edges. No amount
 * of boundary subdivision fixes triangles whose internal diagonals are large.
 *
 * WHY THE CANVAS APPROACH IS CORRECT:
 * - The Canvas 2D API draws 2D polygons perfectly with no geometry artifacts.
 * - Three.js maps the equirectangular canvas onto the sphere using UV coords,
 *   which is mathematically exact — the same way photo textures work.
 * - Two separate spheres (ocean at OCEAN_R, land at LAND_R) have different
 *   radii so there is zero z-fighting.
 * - The land sphere uses a transparent canvas so only the filled land pixels
 *   are visible; the ocean sphere shows through everywhere else.
 *
 * Color pair (unchanged from before):
 *   Ocean sphere : #0a1628  (dark navy)   — set in index.tsx
 *   Land fill    : #0f2318  (dark forest green)
 */
export function buildLandFill(
  features: GeoJSON.Feature[],
  R: number,
): THREE.Mesh {
  /* Canvas resolution: 4096 × 2048 ≈ 1 pixel per 0.088° — fine enough for
   * all country polygons down to small islands.                            */
  const W = 4096;
  const H = 2048;

  const canvas = document.createElement("canvas");
  canvas.width  = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  /* Start fully transparent — only filled land areas will be opaque.
   * The ocean sphere beneath shows through everywhere else.               */
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "#0f2318"; // dark forest green land

  for (const feature of features) {
    const geom = feature.geometry;
    if (!geom || (geom.type !== "Polygon" && geom.type !== "MultiPolygon")) {
      continue;
    }

    const polygons: number[][][][] =
      geom.type === "Polygon"
        ? [(geom.coordinates as number[][][])]
        : (geom.coordinates as number[][][][]);

    for (const polygon of polygons) {
      /* Only the outer ring (index 0) — holes are rare at country level
       * and the GeoJSON data doesn't use them for land boundaries.       */
      const outer = polygon[0];
      if (!outer?.length) continue;

      ctx.beginPath();
      let started = false;
      for (const [lng, lat] of outer) {
        /* Equirectangular projection:
         *   u = (lng + 180) / 360   →   x = u × W
         *   v = (90  - lat) / 180   →   y = v × H  (y=0 = north pole)  */
        const x = ((lng + 180) / 360) * W;
        const y = ((90 - lat) / 180) * H;
        if (!started) { ctx.moveTo(x, y); started = true; }
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);

  return new THREE.Mesh(
    new THREE.SphereGeometry(R, 64, 64),
    new THREE.MeshStandardMaterial({
      map: texture,
      transparent: true,   // transparent pixels show ocean sphere below
      metalness: 0.1,
      roughness: 0.8,
    }),
  );
}