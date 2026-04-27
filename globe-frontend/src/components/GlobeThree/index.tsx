/**
 * src/components/GlobeThree/index.tsx
 */

import { useEffect, useRef } from "react";
import * as THREE from "three";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { point } from "@turf/helpers";

import { ATMO_VERT, ATMO_FRAG } from "./shaders";
import {
  DEFAULT_MAT,
  SELECTED_MAT,
  DIM_MAT,
  buildGrid,
  buildDots,
  buildBorders,
  buildCentroidMap,
  buildLandFill,
  makeStars,
} from "./builders";
import { v2ll } from "./utils";

/* ── Configuration Constants ────────────────────────────────────────── */
const minDistance = 1.5;
const maxDistance = 6.0;
const zoomSpeed   = 0.0015;

/* ── Globe Layer Stack (Radii) ──────────────────────────────────────── */
const GLOBE_R      = 1.0;    // Base reference radius
const OCEAN_R      = 0.998;  // Base navy sphere
const LAND_R       = 1.002;  // Dark green country fills (fixed Z-fighting)
const DOTS_R       = 1.001;  // Interactive dot cloud
const BORDERS_R    = 1.003;  // Green country outlines
const ATMO_INNER_R = 1.06;   // Tight rim glow
const ATMO_OUTER_R = 1.22;   // Expansive blue haze


interface GlobeThreeProps {
  style?: React.CSSProperties;
  onCountrySelect?: (name: string | null) => void;
  selectedCountry?: string | null;
  jumpRequest?: { country: string; seq: number } | null;
  onCountriesLoaded?: (names: string[]) => void;
}

export default function GlobeThree({
  style,
  onCountrySelect,
  selectedCountry,
  jumpRequest,
  onCountriesLoaded,
}: GlobeThreeProps) {
  const mountRef    = useRef<HTMLDivElement>(null);
  const lineMapRef  = useRef<Map<string, THREE.Line[]>>(new Map());
  const featuresRef = useRef<GeoJSON.Feature[]>([]);
  const selectedRef = useRef<string | null>(null);
  const centroidMapRef = useRef<Map<string, { lat: number; lng: number }>>(new Map());
  const jumpTargetRef  = useRef<{ rotY: number; rotX: number } | null>(null);

  /* ── External selection / deselection ──────────────────────────────── */
  useEffect(() => {
    const lmap = lineMapRef.current;
    if (selectedCountry === null || selectedCountry === undefined) {
      lmap.forEach((lines) =>
        lines.forEach((l) => { l.material = DEFAULT_MAT; })
      );
      selectedRef.current = null;
    } else {
      lmap.forEach((lines, key) =>
        lines.forEach((l) => {
          l.material = key === selectedCountry ? SELECTED_MAT : DIM_MAT;
        })
      );
      selectedRef.current = selectedCountry;
    }
  }, [selectedCountry]);

  /* ── Jump-to-country ──────────────────────────────────────────────── */
  useEffect(() => {
    if (!jumpRequest) return;
    const centroid = centroidMapRef.current.get(jumpRequest.country);
    if (!centroid) return;
    jumpTargetRef.current = {
      rotY: -(Math.PI / 2 + THREE.MathUtils.degToRad(centroid.lng)),
      rotX: Math.max(
        -Math.PI / 2.2,
        Math.min(Math.PI / 2.2, THREE.MathUtils.degToRad(centroid.lat)),
      ),
    };
  }, [jumpRequest]);

  /* ── Three.js setup ───────────────────────────────────────────────── */
  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, stencil: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(el.clientWidth, el.clientHeight);
    renderer.setClearColor(0x000000, 0);
    renderer.autoClearStencil = true;
    el.appendChild(renderer.domElement);

    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, el.clientWidth / el.clientHeight, 0.1, 200);
    camera.position.z = 2.7;

    const globeGroup = new THREE.Group();
    scene.add(globeGroup);

    scene.add(new THREE.AmbientLight(0xffffff, 0.2));
    const sun = new THREE.DirectionalLight(0xffffff, 0.3);
    sun.position.set(5, 3, 5);
    scene.add(sun);

    /* ── Ocean sphere ─────────────────────────────────────────────────
     * Solid dark navy — the ocean base colour.
     * Land is rendered on top as a separate filled mesh group (see below)
     * so the two are visually distinct without any texture file.
     * Colour pair:
     *   Ocean : #0a1628  dark navy
     *   Land  : #0f2318  dark forest green  (set in buildLandFill)
     */
    globeGroup.add(
      new THREE.Mesh(
        new THREE.SphereGeometry(OCEAN_R, 64, 64),
        new THREE.MeshStandardMaterial({
          color: new THREE.Color(0x0a1628),
          metalness: 0.1,
          roughness: 0.8,
        }),
      )
    );

    globeGroup.add(buildGrid(GLOBE_R));
    globeGroup.add(buildDots(DOTS_R));

    buildBorders(BORDERS_R).then(({ group, lineMap, features }) => {
      globeGroup.add(group);
      lineMapRef.current  = lineMap;
      featuresRef.current = features;
      centroidMapRef.current = buildCentroidMap(features);
      onCountriesLoaded?.(Array.from(lineMap.keys()).sort());

      /* Land fill: renders country polygons in dark green at LAND_R,
       * just above the ocean sphere at R*0.998.                       */
      globeGroup.add(buildLandFill(features, LAND_R));

      /* Catch-up: if a country was selected before borders loaded, apply now */
      const sel = selectedRef.current;
      if (sel) {
        lineMap.forEach((lines, key) =>
          lines.forEach((l) => {
            l.material = key === sel ? SELECTED_MAT : DIM_MAT;
          })
        );
      }
    });

    const addAtmo = (
      r: number, col: number, coeff: number, power: number,
      side: THREE.Side = THREE.BackSide,
    ) => {
      scene.add(
        new THREE.Mesh(
          new THREE.SphereGeometry(r, 64, 64),
          new THREE.ShaderMaterial({
            vertexShader: ATMO_VERT, fragmentShader: ATMO_FRAG,
            side, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false,
            uniforms: {
              glowColor: { value: new THREE.Color(col) },
              coeff:     { value: coeff },
              power:     { value: power },
            },
          }),
        )
      );
    };
    addAtmo(ATMO_OUTER_R, 0x00ccff, 0.55, 4.2);
    addAtmo(ATMO_INNER_R, 0x00ff88, 0.40, 6.0);

    scene.add(makeStars());

    /* ── Interaction state ──────────────────────────────────────────── */
    let drag    = false;
    let auto    = true;
    let didDrag = false;
    const vel = { x: 0, y: 0 };
    let pm    = { x: 0, y: 0 };

    /* Pinch-to-zoom: tracks inter-finger distance between touchmove frames */
    let pinchDist: number | null = null;

    const getTouchDist = (e: TouchEvent): number => {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const xy = (e: MouseEvent | TouchEvent) => ({
      x: (e as MouseEvent).clientX ?? (e as TouchEvent).touches?.[0]?.clientX ?? 0,
      y: (e as MouseEvent).clientY ?? (e as TouchEvent).touches?.[0]?.clientY ?? 0,
    });

    const onDown = (e: MouseEvent | TouchEvent) => {
      jumpTargetRef.current = null; // user takes control; cancel any jump
      /* Ignore multi-touch starts — pinch is handled in onMove */
      if ((e as TouchEvent).touches && (e as TouchEvent).touches.length > 1) return;
      drag = true; auto = false; didDrag = false;
      pm = xy(e); vel.x = vel.y = 0;
    };

    const onUp = () => {
      if (!drag && pinchDist === null) return;
      drag = false;
      pinchDist = null;
      setTimeout(() => { if (!drag) auto = true; }, 3_000);
    };

    const onMove = (e: MouseEvent | TouchEvent) => {
      const te = e as TouchEvent;

      /* ── Two-finger pinch → zoom ──────────────────────────────────── */
      if (te.touches && te.touches.length === 2) {
        e.preventDefault(); // block browser native page-zoom
        const dist = getTouchDist(te);
        if (pinchDist !== null) {
          const delta = pinchDist - dist; // positive = fingers closer = zoom out
          camera.position.z = Math.max(minDistance, Math.min(maxDistance, camera.position.z + delta * 0.012));
          auto = false;
          setTimeout(() => { if (!drag) auto = true; }, 3_000);
        }
        pinchDist = dist;
        return;
      }

      /* ── Single finger → rotate ───────────────────────────────────── */
      pinchDist = null;
      if (!drag) return;
      const p  = xy(e);
      const dx = p.x - pm.x;
      const dy = p.y - pm.y;
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) didDrag = true;

      const sensitivityFactor = Math.pow(camera.position.z / 3.5, 1.2);
      vel.y = dx * 0.005 * sensitivityFactor;
      vel.x = dy * 0.005 * sensitivityFactor;
      pm = p;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      camera.position.z = Math.max(
        minDistance,
        Math.min(maxDistance, camera.position.z + e.deltaY * zoomSpeed),
      );
      auto = false;
      setTimeout(() => { if (!drag) auto = true; }, 3_000);
    };

    const onClick = (e: MouseEvent) => {
      if (didDrag) return;

      const rect = el.getBoundingClientRect();
      const x    =  ((e.clientX - rect.left) / rect.width)  * 2 - 1;
      const y    = -((e.clientY - rect.top)  / rect.height) * 2 + 1;

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(x, y), camera);

      const hitSphere = new THREE.Mesh(new THREE.SphereGeometry(GLOBE_R, 64, 64));
      globeGroup.add(hitSphere);
      const hits = raycaster.intersectObject(hitSphere);
      globeGroup.remove(hitSphere);

      if (!hits.length) return;

      const localPt = hits[0].point
        .clone()
        .applyMatrix4(globeGroup.matrixWorld.clone().invert());
      const { lng, lat } = v2ll(localPt);
      const pt = point([lng, lat]);

      const found = featuresRef.current.find((f) => {
        try {
          return booleanPointInPolygon(
            pt, f as GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>,
          );
        } catch { return false; }
      });

      const name = (found?.properties?.name as string) ?? null;
      const prev = selectedRef.current;
      const lmap = lineMapRef.current;

      lmap.forEach((lines) => lines.forEach((l) => { l.material = DEFAULT_MAT; }));

      if (!name || name === prev) {
        selectedRef.current = null;
        onCountrySelect?.(null);
      } else {
        lmap.forEach((lines, key) =>
          lines.forEach((l) => { l.material = key === name ? SELECTED_MAT : DIM_MAT; })
        );
        selectedRef.current = name;
        onCountrySelect?.(name);
      }
    };

    /* ── Event listeners ────────────────────────────────────────────── */
    el.addEventListener("mousedown",  onDown  as EventListener);
    el.addEventListener("mousemove",  onMove  as EventListener);
    el.addEventListener("touchstart", onDown  as EventListener, { passive: true });
    el.addEventListener("touchmove",  onMove  as EventListener, { passive: false }); // non-passive for pinch preventDefault
    el.addEventListener("click",      onClick);
    el.addEventListener("wheel",      onWheel as EventListener, { passive: false });
    window.addEventListener("mouseup",  onUp);
    window.addEventListener("touchend", onUp);

    /* ── Resize ─────────────────────────────────────────────────────── */
    const onResize = () => {
      const { clientWidth: w, clientHeight: h } = el;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      renderer.render(scene, camera);
    };
    const resizeObserver = new ResizeObserver(onResize);
    resizeObserver.observe(el);

    /* ── Animation loop ─────────────────────────────────────────────── */
    let animId: number;

    const shortAngleDiff = (from: number, to: number): number =>
      ((to - from) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI;

    const loop = () => {
      animId = requestAnimationFrame(loop);

      if (jumpTargetRef.current) {
        auto = false;
        const { rotY, rotX } = jumpTargetRef.current;
        const dY = shortAngleDiff(globeGroup.rotation.y, rotY);
        const dX = rotX - globeGroup.rotation.x;
        globeGroup.rotation.y += dY * 0.08;
        globeGroup.rotation.x += dX * 0.08;
        if (Math.abs(dY) < 0.004 && Math.abs(dX) < 0.004) {
          globeGroup.rotation.y = rotY;
          globeGroup.rotation.x = rotX;
          jumpTargetRef.current = null;
          setTimeout(() => { if (!drag) auto = true; }, 3_000);
        }
      } else if (auto) {
        globeGroup.rotation.y += 0.001;
      } else {
        globeGroup.rotation.y += vel.y;
        globeGroup.rotation.x = Math.max(
          -Math.PI / 2.2,
          Math.min(Math.PI / 2.2, globeGroup.rotation.x + vel.x),
        );
        vel.x *= 0.88;
        vel.y *= 0.88;
      }

      renderer.render(scene, camera);
    };
    loop();

    /* ── Cleanup ────────────────────────────────────────────────────── */
    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      window.removeEventListener("mouseup",  onUp);
      window.removeEventListener("touchend", onUp);
      el.removeEventListener("mousedown",  onDown  as EventListener);
      el.removeEventListener("mousemove",  onMove  as EventListener);
      el.removeEventListener("touchstart", onDown  as EventListener);
      el.removeEventListener("touchmove",  onMove  as EventListener);
      el.removeEventListener("click",      onClick);
      el.removeEventListener("wheel",      onWheel as EventListener);
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div
      ref={mountRef}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        cursor: "grab",
        touchAction: "none",
        ...style,
      }}
    />
  );
}