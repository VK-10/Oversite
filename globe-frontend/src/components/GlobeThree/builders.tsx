/**
 * src/components/GlobeThree/builders.ts
 *
 * Factory functions that create reusable Three.js objects:
 *   - Shared border materials  (DEFAULT, SELECTED, DIM)
 *   - Lat/lng grid lines
 *   - Fibonacci dot cloud
 *   - Country border geometry from amCharts GeoJSON
 *   - Starfield
 *
 * None of these depend on React — they are plain imperative Three.js code
 * and can be unit-tested or used in a vanilla TS context.
 */

import * as THREE from "three";
import worldIndiaUltra from "@amcharts/amcharts4-geodata/worldIndiaUltra";
import { DOT_VERT, DOT_FRAG } from "./shaders";
import { ll2v } from "./utils";

/* ── Shared border materials ─────────────────────────────────────────── */

/**
 * All world-atlas border lines use NotEqualStencilFunc (ref = 1).
 * This lets you paint a stencil mask (e.g. for a custom India layer)
 * so those pixels are skipped by the world-atlas borders.
 */
function makeBorderMat(
  color: number,
  opacity: number
): THREE.LineBasicMaterial {
  return new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity,
    stencilWrite: false,
    stencilFunc: THREE.NotEqualStencilFunc,
    stencilRef: 1,
  });
}

/** Normal unselected country border */
export const DEFAULT_MAT  = makeBorderMat(0x00ff88, 0.85);
/** Highlighted border for the clicked country */
export const SELECTED_MAT = makeBorderMat(0xffffff, 1.0);
/** Dimmed border for all countries when one is selected */
export const DIM_MAT      = makeBorderMat(0x00ff88, 0.25);

/* ── Lat/lng grid ─────────────────────────────────────────────────────── */

export function buildGrid(R: number): THREE.Group {
  const g   = new THREE.Group();
  const dim = new THREE.LineBasicMaterial({
    color: 0x00ff88,
    transparent: true,
    opacity: 0.07,
  });
  const eq = new THREE.LineBasicMaterial({
    color: 0x00ff88,
    transparent: true,
    opacity: 0.20,
  });

  for (let lat = -80; lat <= 80; lat += 20) {
    const phi = THREE.MathUtils.degToRad(lat);
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 128; i++) {
      const lam = (i / 128) * Math.PI * 2;
      pts.push(
        new THREE.Vector3(
          R * Math.cos(phi) * Math.cos(lam),
          R * Math.sin(phi),
          R * Math.cos(phi) * Math.sin(lam),
        )
      );
    }
    g.add(
      new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(pts),
        lat === 0 ? eq : dim,
      )
    );
  }

  for (let lng = 0; lng < 360; lng += 20) {
    const lam = THREE.MathUtils.degToRad(lng);
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 128; i++) {
      const phi = (i / 128) * Math.PI * 2 - Math.PI;
      pts.push(
        new THREE.Vector3(
          R * Math.cos(phi) * Math.cos(lam),
          R * Math.sin(phi),
          R * Math.cos(phi) * Math.sin(lam),
        )
      );
    }
    g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), dim));
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
      vertexShader: DOT_VERT,
      fragmentShader: DOT_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { col: { value: new THREE.Color(0x00ff88) } },
    })
  );
}

/* ── Country borders ─────────────────────────────────────────────────── */

export interface BorderResult {
  group:    THREE.Group;
  /** Maps country name → the Three.js Line objects that draw its border */
  lineMap:  Map<string, THREE.Line[]>;
  features: GeoJSON.Feature[];
}

export async function buildBorders(R: number): Promise<BorderResult> {
  const group    = new THREE.Group();
  const lineMap  = new Map<string, THREE.Line[]>();
  const features: GeoJSON.Feature[] = [];

  const data       = worldIndiaUltra as any;
  const geoFeatures = data.features || [];

  for (const feature of geoFeatures) {
    const name: string = feature.properties?.name || String(feature.id);
    const lines: THREE.Line[] = [];
    const geometry = feature.geometry;

    if (!geometry) continue;

    const coords = geometry.type === "Polygon" 
      ? [geometry.coordinates] 
      : geometry.coordinates;


    (coords as number[][][][]).forEach((polygon) => {
          polygon.forEach((ring) => {
            const pts = ring.map(([lng, lat]) => ll2v(lng, lat, R));
            if (pts.length >= 2) {
              const line = new THREE.Line(
                new THREE.BufferGeometry().setFromPoints(pts),
                DEFAULT_MAT
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
  const pos = new Float32Array(n * 3).map(() => (Math.random() - 0.5) * 90);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  return new THREE.Points(
    geo,
    new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.055,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
    })
  );
}