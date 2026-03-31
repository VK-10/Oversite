import { useEffect, useRef } from "react";
import * as THREE from "three";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { point } from "@turf/helpers";



interface GlobeThreeProps {
  style?: React.CSSProperties;
  onCountrySelect?: (name: string | null) => void;
}

/* ── Atmosphere shaders ── */
const ATMO_VERT = `
varying vec3 vNormal;
void main() {
  vNormal = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
const ATMO_FRAG = `
varying vec3 vNormal;
uniform vec3  glowColor;
uniform float coeff;
uniform float power;
void main() {
  float intensity = pow(coeff - dot(vNormal, vec3(0,0,1)), power);
  gl_FragColor = vec4(glowColor * intensity, intensity);
}`;

/* ── Dot grid shaders ── */
const DOT_VERT = `
attribute float vis;
varying   float vVis;
void main() {
  vVis = vis;
  gl_PointSize = 1.8;
  gl_Position  = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
const DOT_FRAG = `
varying float vVis;
uniform vec3 col;
void main() {
  if (vVis < 0.5) discard;
  float d = length(gl_PointCoord - 0.5);
  if (d > 0.5) discard;
  gl_FragColor = vec4(col, 0.5 - d);
}`;

/* ── lng/lat → Vec3 ── */
function ll2v(lng: number, lat: number, r: number): THREE.Vector3 {
  const phi = THREE.MathUtils.degToRad(90 - lat);
  const lam = THREE.MathUtils.degToRad(-lng);
  return new THREE.Vector3(
    r * Math.sin(phi) * Math.cos(lam),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(lam),
  );
}

/* ── Vec3 → { lng, lat } ── */
function v2ll(v: THREE.Vector3): { lat: number; lng: number } {
  const lat = 90 - THREE.MathUtils.radToDeg(Math.acos(v.y / v.length()));
  const lng = -THREE.MathUtils.radToDeg(Math.atan2(v.z, v.x));
  return { lat, lng };
}

/* ── Web Mercator metres → [lng, lat] ── */
function metersToLngLat(mx: number, my: number): [number, number] {
  const lng = (mx / 20037508.34) * 180;
  const lat = (Math.atan(Math.exp((my / 20037508.34) * Math.PI)) / Math.PI) * 360 - 90;
  return [lng, lat];
}

/* ─────────────────────────────────────────────
   Materials
   All world-atlas border materials use NotEqualStencilFunc (ref=1).
   They skip any screen pixel where the India stencil mask has written 1.
───────────────────────────────────────────── */
function makeBorderMat(color: number, opacity: number): THREE.LineBasicMaterial {
  return new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity,
    stencilWrite: false,
    stencilFunc:  THREE.NotEqualStencilFunc,
    stencilRef:   1,
  });
}
const DEFAULT_MAT  = makeBorderMat(0x00ff88, 0.85);
const SELECTED_MAT = makeBorderMat(0xffffff, 1.0);
const DIM_MAT      = makeBorderMat(0x00ff88, 0.25);

/*
  India stencil material.
  Writes stencil ref=1 over every screen pixel that India's mesh covers.
  No colour output, no depth interaction, DoubleSide so winding order is irrelevant.
*/
const INDIA_STENCIL_MAT = new THREE.MeshBasicMaterial({
  colorWrite:   false,
  depthTest:    false,  // write stencil regardless of depth
  depthWrite:   false,
  side:         THREE.DoubleSide,
  stencilWrite: true,
  stencilFunc:  THREE.AlwaysStencilFunc,
  stencilRef:   1,
  stencilZPass: THREE.ReplaceStencilOp,
  stencilFail:  THREE.ReplaceStencilOp,
  stencilZFail: THREE.ReplaceStencilOp,
});

/* ── Grid lines ── */
function buildGrid(R: number): THREE.Group {
  const g   = new THREE.Group();
  const dim = new THREE.LineBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.07 });
  const eq  = new THREE.LineBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.20 });
  for (let lat = -80; lat <= 80; lat += 20) {
    const phi = THREE.MathUtils.degToRad(lat);
    const pts = [];
    for (let i = 0; i <= 128; i++) {
      const lam = (i / 128) * Math.PI * 2;
      pts.push(new THREE.Vector3(R * Math.cos(phi) * Math.cos(lam), R * Math.sin(phi), R * Math.cos(phi) * Math.sin(lam)));
    }
    g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lat === 0 ? eq : dim));
  }
  for (let lng = 0; lng < 360; lng += 20) {
    const lam = THREE.MathUtils.degToRad(lng);
    const pts = [];
    for (let i = 0; i <= 128; i++) {
      const phi = (i / 128) * Math.PI * 2 - Math.PI;
      pts.push(new THREE.Vector3(R * Math.cos(phi) * Math.cos(lam), R * Math.sin(phi), R * Math.cos(phi) * Math.sin(lam)));
    }
    g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), dim));
  }
  return g;
}

/* ── Fibonacci dot cloud ── */
function buildDots(R: number, n = 9000): THREE.Points {
  const pos = new Float32Array(n * 3);
  const vis = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const phi   = Math.acos(1 - 2 * (i + 0.5) / n);
    const theta = Math.PI * (1 + Math.sqrt(5)) * i;
    pos[i*3]   = R * Math.sin(phi) * Math.cos(theta);
    pos[i*3+1] = R * Math.cos(phi);
    pos[i*3+2] = R * Math.sin(phi) * Math.sin(theta);
    vis[i] = Math.random() > 0.4 ? 1 : 0;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("vis",      new THREE.BufferAttribute(vis, 1));
  return new THREE.Points(geo, new THREE.ShaderMaterial({
    vertexShader: DOT_VERT, fragmentShader: DOT_FRAG,
    transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { col: { value: new THREE.Color(0x00ff88) } },
  }));
}

/* ── Country borders from Natural Earth TopoJSON ── */
interface BorderResult {
  group:    THREE.Group;
  lineMap:  Map<string, THREE.Line[]>;
  features: GeoJSON.Feature[];
}

async function buildBorders(R: number): Promise<BorderResult> {
  const group   = new THREE.Group();
  const lineMap = new Map<string, THREE.Line[]>();
  const features: GeoJSON.Feature[] = [];

  try {
    const res  = await fetch("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json");
    const topo = await res.json();
    const { scale, translate } = topo.transform;

    function decodeArc(arcIdx: number): [number, number][] {
      const reversed = arcIdx < 0;
      const raw      = topo.arcs[reversed ? ~arcIdx : arcIdx];
      let x = 0, y = 0;
      const coords: [number, number][] = raw.map(([dx, dy]: [number, number]) => {
        x += dx; y += dy;
        return [x * scale[0] + translate[0], y * scale[1] + translate[1]] as [number, number];
      });
      return reversed ? coords.reverse() : coords;
    }

    function decodeRing(ring: number[]): [number, number][] {
      const coords: [number, number][] = [];
      for (const idx of ring) {
        const arc = decodeArc(idx);
        if (coords.length > 0) arc.shift();
        coords.push(...arc);
      }
      return coords;
    }

    for (const country of topo.objects.countries.geometries) {
      const name: string = country.properties?.name ?? String(country.id);

      // India: skip rendering (handled by buildIndiaBorders) but keep GeoJSON for hit-testing
      if (String(country.id) === "356") {
        const geometry = country.type === "Polygon"
          ? { type: "Polygon"      as const, coordinates: (country.arcs as number[][])  .map((r: number[])    => decodeRing(r)) }
          : { type: "MultiPolygon" as const, coordinates: (country.arcs as number[][][]).map((p: number[][]) => p.map((r: number[]) => decodeRing(r))) };
        features.push({ type: "Feature", properties: { name }, geometry });
        continue;
      }

      const lines: THREE.Line[] = [];

      if (country.type === "Polygon") {
        const polygonRings: [number, number][][] = [];
        for (const ring of country.arcs as number[][]) {
          const coords = decodeRing(ring);
          polygonRings.push(coords);
          const pts = coords.map(([lng, lat]) => ll2v(lng, lat, R));
          if (pts.length >= 2) {
            const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), DEFAULT_MAT);
            lines.push(line);
            group.add(line);
          }
        }
        features.push({ type: "Feature", properties: { name },
          geometry: { type: "Polygon", coordinates: polygonRings } });

      } else if (country.type === "MultiPolygon") {
        const multi: [number, number][][][] = [];
        for (const polygon of country.arcs as number[][][]) {
          const rings: [number, number][][] = [];
          for (const ring of polygon) {
            const coords = decodeRing(ring);
            rings.push(coords);
            const pts = coords.map(([lng, lat]) => ll2v(lng, lat, R));
            if (pts.length >= 2) {
              const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), DEFAULT_MAT);
              lines.push(line);
              group.add(line);
            }
          }
          multi.push(rings);
        }
        features.push({ type: "Feature", properties: { name },
          geometry: { type: "MultiPolygon", coordinates: multi } });
      }

      if (lines.length) lineMap.set(name, lines);
    }
  } catch (e) {
    console.warn("GeoJSON load failed:", e);
  }

  return { group, lineMap, features };
}

/* ─────────────────────────────────────────────
   India stencil mask
   Reads the high-detail India boundary file (same one used for the orange
   border) and builds an invisible mesh covering India's claimed territory.
   renderOrder = -1 ensures it runs before all border lines (order 0),
   writing stencil=1 so those lines skip India's pixels entirely.
───────────────────────────────────────────── */
async function buildIndiaMask(R: number): Promise<THREE.Mesh | null> {
  try {
    const res  = await fetch("/India_Country_Boundary_topojson.json");
    const topo = await res.json();
    const { scale, translate } = topo.transform ?? { scale: [1, 1], translate: [0, 0] };

    const pts3d: THREE.Vector3[] = [];
    for (const arc of topo.arcs) {
      let x = 0, y = 0;
      for (const [dx, dy] of arc) {
        x += dx; y += dy;
        const [lng, lat] = metersToLngLat(x * scale[0] + translate[0], y * scale[1] + translate[1]);
        pts3d.push(ll2v(lng, lat, R));
      }
    }
    if (pts3d.length < 3) return null;

    /*
      Fan triangulation from the spherical centroid of all boundary points.
      India's outline is roughly convex so this gives complete interior coverage.
      DoubleSide + depthTest:false means winding order and depth never block writes.
    */
    const centroid = new THREE.Vector3();
    pts3d.forEach(p => centroid.add(p.clone().normalize()));
    centroid.normalize().multiplyScalar(R * 0.999);

    const positions = new Float32Array((pts3d.length + 1) * 3);
    positions[0] = centroid.x;
    positions[1] = centroid.y;
    positions[2] = centroid.z;
    pts3d.forEach((p, i) => {
      positions[(i + 1) * 3]     = p.x;
      positions[(i + 1) * 3 + 1] = p.y;
      positions[(i + 1) * 3 + 2] = p.z;
    });

    const indices: number[] = [];
    for (let i = 1; i <= pts3d.length; i++) {
      indices.push(0, i, i < pts3d.length ? i + 1 : 1);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geo.setIndex(indices);

    const mesh = new THREE.Mesh(geo, INDIA_STENCIL_MAT);
    mesh.renderOrder = -1; // before all border lines
    return mesh;
  } catch (e) {
    console.warn("India mask not loaded:", e);
    return null;
  }
}

/* ── India borders (high-detail, Web Mercator, no stencil restriction) ── */
async function buildIndiaBorders(R: number): Promise<THREE.Group> {
  const g = new THREE.Group();
  try {
    const res  = await fetch("/India_Country_Boundary_topojson.json");
    const topo = await res.json();
    const { scale, translate } = topo.transform ?? { scale: [1, 1], translate: [0, 0] };

    // No stencilFunc set → always renders, appears on top of stencil mask
    const mat = new THREE.LineBasicMaterial({
      color: 0xff9933, transparent: true, opacity: 1.0, linewidth: 2,
    });

    for (const arc of topo.arcs) {
      const pts: THREE.Vector3[] = [];
      let x = 0, y = 0;
      for (const [dx, dy] of arc) {
        x += dx; y += dy;
        const [lng, lat] = metersToLngLat(x * scale[0] + translate[0], y * scale[1] + translate[1]);
        pts.push(ll2v(lng, lat, R));
      }
      if (pts.length >= 2) {
        const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat);
        line.renderOrder = 1; // after world-atlas borders
        g.add(line);
      }
    }
  } catch (e) {
    console.warn("India borders not loaded:", e);
  }
  return g;
}

/* ── Starfield ── */
function makeStars(n = 2500): THREE.Points {
  const pos = new Float32Array(n * 3).map(() => (Math.random() - 0.5) * 90);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  return new THREE.Points(geo, new THREE.PointsMaterial({
    color: 0xffffff, size: 0.055, transparent: true, opacity: 0.5,
    blending: THREE.AdditiveBlending,
  }));
}

/* ─────────────────────────────────────────────
   Main component
───────────────────────────────────────────── */
/* ... (Keep all your imports and shader constants exactly the same) ... */

export default function GlobeThree({ style, onCountrySelect }: GlobeThreeProps) {
  const mountRef = useRef<HTMLDivElement>(null);

  const lineMapRef  = useRef<Map<string, THREE.Line[]>>(new Map());
  const featuresRef = useRef<GeoJSON.Feature[]>([]);
  const selectedRef = useRef<string | null>(null);

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
    
    // Starting position
    camera.position.z = 2.7;

    const R = 1.0;
    const globeGroup = new THREE.Group();
    scene.add(globeGroup);

    /* ... (Keep Globe setup: buildGrid, buildDots, buildBorders, buildIndiaMask, buildIndiaBorders, makeStars, mkAtmo) ... */
    // Note: I'm omitting the repetitive geometry/material logic for brevity, 
    // ensure you keep your existing build calls here.
    
    globeGroup.add(new THREE.Mesh(
      new THREE.SphereGeometry(R * 0.998, 64, 64),
      new THREE.MeshBasicMaterial({ color: 0x010e07, transparent: true, opacity: 0.96 }),
    ));
    globeGroup.add(buildGrid(R));
    globeGroup.add(buildDots(R * 1.001));
    buildBorders(R * 1.003).then(({ group, lineMap, features }) => {
      globeGroup.add(group);
      lineMapRef.current = lineMap;
      featuresRef.current = features;
    });
    buildIndiaMask(R * 1.003).then(mask => { if (mask) globeGroup.add(mask); });
    buildIndiaBorders(R * 1.004).then(b => globeGroup.add(b));

    const mkAtmo = (r: number, col: number, coeff: number, power: number, side: THREE.Side = THREE.BackSide) => {
      const m = new THREE.ShaderMaterial({
        vertexShader: ATMO_VERT, fragmentShader: ATMO_FRAG,
        side, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false,
        uniforms: {
          glowColor: { value: new THREE.Color(col) },
          coeff:     { value: coeff },
          power:     { value: power },
        },
      });
      scene.add(new THREE.Mesh(new THREE.SphereGeometry(r, 64, 64), m));
    };
    mkAtmo(R * 1.22, 0x00ccff, 0.55, 4.2);
    mkAtmo(R * 1.06, 0x00ff88, 0.40, 6.0);
    scene.add(makeStars());

    /* ── Interaction Logic ── */
    let drag    = false;
    let auto    = true;
    let didDrag = false;
    const vel = { x: 0, y: 0 };
    let pm    = { x: 0, y: 0 };

    const xy = (e: MouseEvent | TouchEvent) => ({
      x: (e as MouseEvent).clientX ?? (e as TouchEvent).touches?.[0]?.clientX ?? 0,
      y: (e as MouseEvent).clientY ?? (e as TouchEvent).touches?.[0]?.clientY ?? 0,
    });

    const onDown = (e: MouseEvent | TouchEvent) => {
      drag = true; auto = false; didDrag = false;
      pm = xy(e); vel.x = vel.y = 0;
    };

    const onUp = () => {
      if (!drag) return;
      drag = false;
      setTimeout(() => { if (!drag) auto = true; }, 3000);
    };

    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!drag) return;
      const p = xy(e);
      const dx = p.x - pm.x, dy = p.y - pm.y;
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) didDrag = true;
      vel.y = dx * 0.006;
      vel.x = dy * 0.006;
      pm = p;
    };

    /* ── ZOOM LOGIC ── */
    const onWheel = (e: WheelEvent) => {
      // Prevent the page from scrolling while zooming the globe
      e.preventDefault();

      const zoomSpeed = 0.0015;
      const minDistance = 1.5;
      const maxDistance = 6.0;

      // Adjust camera Z position
      camera.position.z += e.deltaY * zoomSpeed;

      // Clamp the zoom distance
      camera.position.z = Math.max(minDistance, Math.min(maxDistance, camera.position.z));
      
      // Stop auto-rotation when user interacts via zoom
      auto = false;
      setTimeout(() => { if (!drag) auto = true; }, 3000);
    };

    const onClick = (e: MouseEvent) => {
        /* ... keep your existing onClick code ... */
        if (didDrag) return;
        const rect = el.getBoundingClientRect();
        const x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1;
        const y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera({ x, y }, camera);
        const hitSphere = new THREE.Mesh(new THREE.SphereGeometry(R, 64, 64));
        globeGroup.add(hitSphere);
        const hits = raycaster.intersectObject(hitSphere);
        globeGroup.remove(hitSphere);
        if (!hits.length) { selectedRef.current = null; onCountrySelect?.(null); return; }
        const localPt = hits[0].point.clone().applyMatrix4(globeGroup.matrixWorld.clone().invert());
        const { lng, lat } = v2ll(localPt);
        const pt = point([lng, lat]);
        const found = featuresRef.current.find(f => {
            try { return booleanPointInPolygon(pt, f as GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>); }
            catch { return false; }
        });
        // (Assuming you have highlightCountry defined like in your original code)
        const name = (found?.properties?.name as string) ?? null;
        const prev = selectedRef.current;
        const lmap = lineMapRef.current;
        if (prev) lmap.forEach(lines => lines.forEach(l => { l.material = DEFAULT_MAT; }));
        if (!name || name === prev) {
            selectedRef.current = null;
            onCountrySelect?.(null);
        } else {
            lmap.forEach((lines, key) => lines.forEach(l => { l.material = key === name ? SELECTED_MAT : DIM_MAT; }));
            selectedRef.current = name;
            onCountrySelect?.(name);
        }
    };

    // Listeners
    el.addEventListener("mousedown",  onDown as EventListener);
    el.addEventListener("mousemove",  onMove as EventListener);
    el.addEventListener("touchstart", onDown as EventListener, { passive: true });
    el.addEventListener("touchmove",  onMove as EventListener, { passive: true });
    el.addEventListener("click",      onClick);
    
    // Wheel event for zoom (non-passive to allow e.preventDefault)
    el.addEventListener("wheel",      onWheel as EventListener, { passive: false });

    window.addEventListener("mouseup",  onUp);
    window.addEventListener("touchend", onUp);

    const onResize = () => {
      camera.aspect = el.clientWidth / el.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(el.clientWidth, el.clientHeight);
    };
    window.addEventListener("resize", onResize);

    let t = 0, animId: number;
    const loop = () => {
      animId = requestAnimationFrame(loop);
      t += 0.012;

      if (auto) {
        globeGroup.rotation.y += 0.003;
      } else {
        globeGroup.rotation.y += vel.y;
        globeGroup.rotation.x = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, globeGroup.rotation.x + vel.x));
        vel.x *= 0.88; vel.y *= 0.88;
      }

      renderer.render(scene, camera);
    };
    loop();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("mouseup",  onUp);
      window.removeEventListener("touchend", onUp);
      window.removeEventListener("resize",   onResize);
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
        position: "absolute", inset: 0,
        width: "100%", height: "100%",
        cursor: "grab",
        ...style,
      }}
    />
  );
}