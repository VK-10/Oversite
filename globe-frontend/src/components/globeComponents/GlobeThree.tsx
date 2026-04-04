import { useEffect, useRef } from "react";
import * as THREE from "three";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { point } from "@turf/helpers";
import worldIndiaUltra from "@amcharts/amcharts4-geodata/worldIndiaUltra";



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
    stencilRef:   1
  });
}
const DEFAULT_MAT  = makeBorderMat(0x00ff88, 0.85);
const SELECTED_MAT = makeBorderMat(0xffffff, 1.0);
const DIM_MAT      = makeBorderMat(0x00ff88, 0.25);

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
  const group = new THREE.Group();
  const lineMap = new Map<string, THREE.Line[]>();
  const features: GeoJSON.Feature[] = [];

  // amCharts4-geodata exports standard GeoJSON
  // We cast to 'any' briefly to handle internal property access safely
  const data = worldIndiaUltra as any;

  // GeoJSON uses a 'features' array
  const geoFeatures = data.features || [];

  for (const feature of geoFeatures) {
    const name: string = feature.properties?.name || String(feature.id);

    const lines: THREE.Line[] = [];
    const geometry = feature.geometry;

    if (!geometry) continue;

    // 2. Handle Polygons and MultiPolygons
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

    if (lines.length) {
      lineMap.set(name, lines);
    }
    features.push(feature);
  }

  // Final return ensures the "must return a value" error is resolved
  return { group, lineMap, features };
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
    
    globeGroup.add(new THREE.Mesh(
      new THREE.SphereGeometry(R * 0.998, 64, 64),
      new THREE.MeshBasicMaterial({ color: 0x010e07}),
    ));
    globeGroup.add(buildGrid(R));
    globeGroup.add(buildDots(R * 1.001));
    buildBorders(R * 1.003).then(({ group, lineMap, features }) => {
      globeGroup.add(group);
      lineMapRef.current = lineMap;
      featuresRef.current = features;
    });

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
        raycaster.setFromCamera(new THREE.Vector2(x, y), camera);
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
        console.log(name)
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
      if (!el) return;
      const width = el.clientWidth;
      const height = el.clientHeight;

      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      
      // FIX: Force an immediate render so the canvas is never empty 
      // between the "clear" and the next animation loop frame.
      renderer.render(scene, camera); 
    };
    const resizeObserver = new ResizeObserver(() => onResize());
    resizeObserver.observe(el);

    let t = 0, animId: number;
    const loop = () => {
      animId = requestAnimationFrame(loop);
      t += 0.012;

      if (auto) {
        globeGroup.rotation.y += 0.001;
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