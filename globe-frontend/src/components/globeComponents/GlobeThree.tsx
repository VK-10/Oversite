import { useEffect, useRef } from "react";
import * as THREE from "three";



interface GlobeThreeProps {
  style?: React.CSSProperties;
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
//@ts-expect-error
function ll2v(lng, lat, r) {
  const phi = THREE.MathUtils.degToRad(90 - lat);
  const lam = THREE.MathUtils.degToRad(-lng);
  return new THREE.Vector3(
    r * Math.sin(phi) * Math.cos(lam),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(lam),
  );
}

/* ── Web Mercator meters → [lng, lat] degrees ── */
//@ts-expect-error
function metersToLngLat(mx, my) {
  const lng = (mx / 20037508.34) * 180;
  const lat = (Math.atan(Math.exp((my / 20037508.34) * Math.PI)) / Math.PI) * 360 - 90;
  return [lng, lat];
}

/* ── Grid lines ── */
//@ts-expect-error
function buildGrid(R) {
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
//@ts-expect-error
function buildDots(R, n = 9000) {
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

async function buildBorders(R: number) {
  const g = new THREE.Group();
  try {
    const res  = await fetch("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json");
    const topo = await res.json();
    // India's numeric ISO code is 356
    // topo.objects.countries.geometries = topo.objects.countries.geometries.filter(
    //   geo => String(geo.id) !== "356"
    // );
  
    const indiaArcs = new Set();
    topo.objects.countries.geometries
      .filter(geo => String(geo.id) === "356")
      .forEach(geo => {
        console.log(typeof geo)
        const rings = geo.arcs ?? [];
        rings.flat(Infinity).forEach(i => indiaArcs.add(Math.abs(i)));
      });
    const { scale, translate } = topo.transform;

    const mat = new THREE.LineBasicMaterial({
      color: 0x00ff88, transparent: true, opacity: 0.85,
    });

    // Decode each TopoJSON arc → Three.js line on sphere
    for (let i = 0; i < topo.arcs.length; i++) {
    if (indiaArcs.has(i)) continue;   // skip India arcs
    const arc = topo.arcs[i];
    const pts = [];
    let x = 0, y = 0;
    for (const [dx, dy] of arc) {
      x += dx; y += dy;
      const lng = x * scale[0] + translate[0];
      const lat = y * scale[1] + translate[1];
      pts.push(ll2v(lng, lat, R));
    }
    if (pts.length >= 2) {
      g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat));
    }
  }
  } catch (e) {
    console.warn("GeoJSON load failed:", e);
  }
  return g;
}

/*India Borders*/
//@ts-expect-error
async function buildIndiaBorders(R) {
  const g = new THREE.Group();
  try {
    const res = await fetch("/India_Country_Boundary_topojson.json")
    const topo = await res.json();
    console.log("transform:", topo.transform);
console.log("first arc first point:", topo.arcs[0][0]);
    const { scale, translate } = topo.transform ?? {
      scale: [1,1],
      translate: [0,0],
    }

    const mat = new THREE.LineBasicMaterial({
      color: 0xff9933,
      transparent: true,
      opacity: 1.0,
      linewidth: 2,
    });

    for (const arc of topo.arcs) {
      const pts = [];
      let x = 0, y = 0;
      for (const [dx, dy] of arc) {
        x += dx; y += dy;
        const mx = (x * scale[0])+ translate[0];
        const my = (y * scale[1])+ translate[1];
        const [lng, lat] = metersToLngLat(mx,my);
        pts.push(ll2v(lng, lat, R));
      }
      if (pts.length >= 2) {
        g.add(new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(pts), mat
        ));
      }
    }
  } catch (e) {
    console.warn("India borders not loaded:", e);
  }
  return g;
}

/* Orbit ring  */
function makeOrbit(scene, orbitR, tiltX, tiltZ, hexColor, speed) {
  const grp = new THREE.Group();
  grp.rotation.x = THREE.MathUtils.degToRad(tiltX);
  grp.rotation.z = THREE.MathUtils.degToRad(tiltZ);

  // Ring
  const pts = Array.from({ length: 257 }, (_, i) => {
    const a = (i / 256) * Math.PI * 2;
    return new THREE.Vector3(Math.cos(a) * orbitR, Math.sin(a) * orbitR, 0);
  });
  const rMat = new THREE.LineDashedMaterial({
    color: hexColor, transparent: true, opacity: 0.28,
    dashSize: 0.16, gapSize: 0.10,
  });
  const ring = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), rMat);
  ring.computeLineDistances();
  grp.add(ring);

  // Dot + sprite glow
  const dot  = new THREE.Mesh(
    new THREE.SphereGeometry(0.024, 8, 8),
    new THREE.MeshBasicMaterial({ color: hexColor }),
  );
  const cv   = document.createElement("canvas");
  cv.width = cv.height = 64;
  const cx2  = cv.getContext("2d");
  const grd  = cx2.createRadialGradient(32, 32, 0, 32, 32, 32);
  const c    = new THREE.Color(hexColor);
  grd.addColorStop(0, `rgba(${Math.round(c.r*255)},${Math.round(c.g*255)},${Math.round(c.b*255)},1)`);
  grd.addColorStop(1, "rgba(0,0,0,0)");
  cx2.fillStyle = grd; cx2.fillRect(0, 0, 64, 64);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({
    map: new THREE.CanvasTexture(cv),
    blending: THREE.AdditiveBlending, transparent: true, opacity: 0.9,
  }));
  sp.scale.setScalar(0.30);
  dot.add(sp);
  grp.add(dot);
  scene.add(grp);

  return { grp, dot, orbitR, speed };
}


/* ── Starfield ── */
function makeStars(n = 2500) {
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

export default function GlobeThree({ style } : GlobeThreeProps) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(el.clientWidth, el.clientHeight);
    renderer.setClearColor(0x000000, 0);
    el.appendChild(renderer.domElement);

    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, el.clientWidth / el.clientHeight, 0.1, 200);
    camera.position.z = 2.7;

    const R = 1.0;

    // Globe group
    const globeGroup = new THREE.Group();
    scene.add(globeGroup);

    // Dark sphere core (occludes back-face lines)
    globeGroup.add(new THREE.Mesh(
      new THREE.SphereGeometry(R * 0.998, 64, 64),
      new THREE.MeshBasicMaterial({ color: 0x010e07, transparent: true, opacity: 0.96 }),
    ));

    // Grid
    globeGroup.add(buildGrid(R));

    // Dot cloud
    globeGroup.add(buildDots(R * 1.001));

    // Country lines (async)
    buildBorders(R * 1.003).then(b => globeGroup.add(b));
    // India Borders (async)
    buildIndiaBorders(R * 1.004).then(b => globeGroup.add(b));

    // Atmosphere layers
    const mkAtmo = (r, col, coeff, power, side = THREE.BackSide) => {
      const m = new THREE.ShaderMaterial({
        vertexShader: ATMO_VERT, fragmentShader: ATMO_FRAG,
        side, blending: THREE.AdditiveBlending,
        transparent: true, depthWrite: false,
        uniforms: { glowColor: { value: new THREE.Color(col) }, coeff: { value: coeff }, power: { value: power } },
      });
      scene.add(new THREE.Mesh(new THREE.SphereGeometry(r, 64, 64), m));
    };
    mkAtmo(R * 1.22, 0x00ccff, 0.55, 4.2);   // outer blue
    mkAtmo(R * 1.06, 0x00ff88, 0.40, 6.0);   // inner green

    // Stars
    scene.add(makeStars());

    const orbits = [
      // makeOrbit(scene, 1.48,  23,   0,  0x00ff88, 0.55), //green
      // makeOrbit(scene, 1.62, -55,  35, 0x4db8ff, -0.32),// blue
      // makeOrbit(scene, 1.38,  70, -15, 0xffad00,  0.20), //yellow
    ];
  

    // scene.add(new THREE.AmbientLight(0x112211, 1));

    // Interaction
    let drag = false, auto = true;
    const vel = { x: 0, y: 0 };
    let pm = { x: 0, y: 0 };
    const xy = e => ({ x: e.clientX ?? e.touches?.[0]?.clientX ?? 0, y: e.clientY ?? e.touches?.[0]?.clientY ?? 0 });

    const onDown = e => { drag = true; auto = false; pm = xy(e); vel.x = vel.y = 0; };
    const onUp   = () => { drag = false; setTimeout(() => { auto = true; }, 3000); };
    const onMove = e => {
      if (!drag) return;
      const p = xy(e);
      vel.y = (p.x - pm.x) * 0.006;
      vel.x = (p.y - pm.y) * 0.006;
      pm = p;
    };

    el.addEventListener("mousedown",  onDown);
    el.addEventListener("mouseup",    onUp);
    el.addEventListener("mouseleave", onUp);
    el.addEventListener("mousemove",  onMove);
    el.addEventListener("touchstart", onDown, { passive: true });
    el.addEventListener("touchend",   onUp);
    el.addEventListener("touchmove",  onMove, { passive: true });

    const onResize = () => {
      camera.aspect = el.clientWidth / el.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(el.clientWidth, el.clientHeight);
    };
    window.addEventListener("resize", onResize);

    let t = 0, animId;
    const loop = () => {
      animId = requestAnimationFrame(loop);
      t += 0.012;

      if (auto) {
        globeGroup.rotation.y += 0.003;
      } else {
        globeGroup.rotation.y += vel.y;
        globeGroup.rotation.x = Math.max(-Math.PI / 2.2,
          Math.min(Math.PI / 2.2, globeGroup.rotation.x + vel.x));
        vel.x *= 0.88; vel.y *= 0.88;
      }

      orbits.forEach(({ dot, orbitR, speed }) => {
        const a = t * speed;
        dot.position.set(Math.cos(a) * orbitR, Math.sin(a) * orbitR, 0);
      });

      renderer.render(scene, camera);
    };
    loop();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", onResize);
      el.removeEventListener("mousedown",  onDown);
      el.removeEventListener("mouseup",    onUp);
      el.removeEventListener("mouseleave", onUp);
      el.removeEventListener("mousemove",  onMove);
      el.removeEventListener("touchstart", onDown);
      el.removeEventListener("touchend",   onUp);
      el.removeEventListener("touchmove",  onMove);
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div
      ref={mountRef}
      style={{
        position: "absolute", right: "-6%", top: "50%",
        transform: "translateY(-50%)",
        width: "min(700px, 78vw)", height: "min(700px, 78vw)",
        cursor: "grab",
        ...style,
      }}
    />
  );
}