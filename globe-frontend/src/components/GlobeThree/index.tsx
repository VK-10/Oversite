/**
 * src/components/GlobeThree/index.tsx
 *
 * React wrapper for the interactive Three.js globe.
 *
 * All GLSL shader strings live in  ./shaders.ts
 * All Three.js object builders live in ./builders.ts
 * Coordinate math lives in           ./utils.ts
 *
 * This file is intentionally thin: it owns only the React lifecycle
 * (useEffect / useRef), the renderer setup, the interaction handlers,
 * and the animation loop.
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
  makeStars,
} from "./builders";
import { v2ll } from "./utils";

/* ── Props ────────────────────────────────────────────────────────────── */

interface GlobeThreeProps {
  style?: React.CSSProperties;
  /**
   * Called with a country name when the user clicks a country,
   * or with null when they click ocean / same country again.
   */
  onCountrySelect?: (name: string | null) => void;
  /**
   * Controlled selection driven by the parent (GlobeView).
   * When this becomes null — e.g. the user closes the panel with the X
   * button — GlobeThree resets all line materials to clear the highlight.
   */
  selectedCountry?: string | null;
}

/* ── Component ────────────────────────────────────────────────────────── */

export default function GlobeThree({ style, onCountrySelect, selectedCountry }: GlobeThreeProps) {
  const mountRef = useRef<HTMLDivElement>(null);

  /* These refs survive re-renders without triggering them */
  const lineMapRef  = useRef<Map<string, THREE.Line[]>>(new Map());
  const featuresRef = useRef<GeoJSON.Feature[]>([]);
  const selectedRef = useRef<string | null>(null);

  /**
   * External deselect — fires when the parent sets selectedCountry to null
   * (e.g. X button closes the panel).  Resets all line materials and clears
   * the internal ref so the next click starts fresh.
   */
  useEffect(() => {
    if (selectedCountry !== null) return;
    lineMapRef.current.forEach((lines) =>
      lines.forEach((l) => { l.material = DEFAULT_MAT; })
    );
    selectedRef.current = null;
  }, [selectedCountry]);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    /* ── Renderer ──────────────────────────────────────────────────── */
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      stencil: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(el.clientWidth, el.clientHeight);
    renderer.setClearColor(0x000000, 0);
    renderer.autoClearStencil = true;
    el.appendChild(renderer.domElement);

    /* ── Scene / camera ─────────────────────────────────────────────── */
    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      42,
      el.clientWidth / el.clientHeight,
      0.1,
      200,
    );
    camera.position.z = 2.7;

    const R = 1.0;
    const globeGroup = new THREE.Group();
    scene.add(globeGroup);

    /* ── Lighting ───────────────────────────────────────────────────── */
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const sun = new THREE.DirectionalLight(0xffffff, 1.2);
    sun.position.set(5, 3, 5);
    scene.add(sun);

    /* ── Globe mesh ─────────────────────────────────────────────────── */
    const earthTexture = new THREE.TextureLoader().load(
      "/src/assets/Whole_world_-_land_and_oceans_12000.jpeg"
    );
    globeGroup.add(
      new THREE.Mesh(
        new THREE.SphereGeometry(R * 0.998, 64, 64),
        new THREE.MeshStandardMaterial({
          map: earthTexture,
          metalness: 0.1,
          roughness: 0.8,
        }),
      )
    );

    /* ── Decorative layers ──────────────────────────────────────────── */
    globeGroup.add(buildGrid(R));
    globeGroup.add(buildDots(R * 1.001));

    buildBorders(R * 1.003).then(({ group, lineMap, features }) => {
      globeGroup.add(group);
      lineMapRef.current  = lineMap;
      featuresRef.current = features;
    });

    /* ── Atmosphere glow helper ─────────────────────────────────────── */
    const addAtmo = (
      r: number,
      col: number,
      coeff: number,
      power: number,
      side: THREE.Side = THREE.BackSide,
    ) => {
      scene.add(
        new THREE.Mesh(
          new THREE.SphereGeometry(r, 64, 64),
          new THREE.ShaderMaterial({
            vertexShader: ATMO_VERT,
            fragmentShader: ATMO_FRAG,
            side,
            blending: THREE.AdditiveBlending,
            transparent: true,
            depthWrite: false,
            uniforms: {
              glowColor: { value: new THREE.Color(col) },
              coeff:     { value: coeff },
              power:     { value: power },
            },
          }),
        )
      );
    };
    addAtmo(R * 1.22, 0x00ccff, 0.55, 4.2);
    addAtmo(R * 1.06, 0x00ff88, 0.40, 6.0);

    /* ── Stars ──────────────────────────────────────────────────────── */
    scene.add(makeStars());

    /* ── Interaction state ──────────────────────────────────────────── */
    let drag    = false;
    let auto    = true;
    let didDrag = false;
    const vel = { x: 0, y: 0 };
    let pm    = { x: 0, y: 0 };

    const xy = (e: MouseEvent | TouchEvent) => ({
      x: (e as MouseEvent).clientX
        ?? (e as TouchEvent).touches?.[0]?.clientX
        ?? 0,
      y: (e as MouseEvent).clientY
        ?? (e as TouchEvent).touches?.[0]?.clientY
        ?? 0,
    });

    const onDown = (e: MouseEvent | TouchEvent) => {
      drag = true; auto = false; didDrag = false;
      pm = xy(e); vel.x = vel.y = 0;
    };

    const onUp = () => {
      if (!drag) return;
      drag = false;
      setTimeout(() => { if (!drag) auto = true; }, 3_000);
    };

    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!drag) return;
      const p  = xy(e);
      const dx = p.x - pm.x;
      const dy = p.y - pm.y;
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) didDrag = true;
      vel.y = dx * 0.006;
      vel.x = dy * 0.006;
      pm = p;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomSpeed   = 0.0015;
      const minDistance = 1.5;
      const maxDistance = 6.0;
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

      /* Use a temporary sphere for hit-testing */
      const hitSphere = new THREE.Mesh(new THREE.SphereGeometry(R, 64, 64));
      globeGroup.add(hitSphere);
      const hits = raycaster.intersectObject(hitSphere);
      globeGroup.remove(hitSphere);

      // Miss = click landed on the canvas but outside the globe sphere
      // (the dark space around the planet). We intentionally do nothing here
      // so an open panel is not dismissed by an accidental off-globe click.
      if (!hits.length) return;

      /* Convert hit position to lat/lng and find matching feature */
      const localPt = hits[0].point
        .clone()
        .applyMatrix4(globeGroup.matrixWorld.clone().invert());
      const { lng, lat } = v2ll(localPt);
      const pt = point([lng, lat]);

      const found = featuresRef.current.find((f) => {
        try {
          return booleanPointInPolygon(
            pt,
            f as GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>,
          );
        } catch {
          return false;
        }
      });

      const name = (found?.properties?.name as string) ?? null;
      const prev = selectedRef.current;
      const lmap = lineMapRef.current;

      /* Reset all materials first */
      lmap.forEach((lines) =>
        lines.forEach((l) => { l.material = DEFAULT_MAT; })
      );

      if (!name || name === prev) {
        /* Click same country or empty — deselect */
        selectedRef.current = null;
        onCountrySelect?.(null);
      } else {
        /* Highlight clicked country, dim all others */
        lmap.forEach((lines, key) =>
          lines.forEach((l) => {
            l.material = key === name ? SELECTED_MAT : DIM_MAT;
          })
        );
        selectedRef.current = name;
        onCountrySelect?.(name);
      }
    };

    /* ── Event listeners ────────────────────────────────────────────── */
    el.addEventListener("mousedown",  onDown as EventListener);
    el.addEventListener("mousemove",  onMove as EventListener);
    el.addEventListener("touchstart", onDown as EventListener, { passive: true });
    el.addEventListener("touchmove",  onMove as EventListener, { passive: true });
    el.addEventListener("click",      onClick);
    el.addEventListener("wheel",      onWheel as EventListener, { passive: false });
    window.addEventListener("mouseup",  onUp);
    window.addEventListener("touchend", onUp);

    /* ── Resize observer ────────────────────────────────────────────── */
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
    const loop = () => {
      animId = requestAnimationFrame(loop);
      if (auto) {
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
      el.removeEventListener("mousedown",  onDown as EventListener);
      el.removeEventListener("mousemove",  onMove as EventListener);
      el.removeEventListener("touchstart", onDown as EventListener);
      el.removeEventListener("touchmove",  onMove as EventListener);
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
        ...style,
      }}
    />
  );
}