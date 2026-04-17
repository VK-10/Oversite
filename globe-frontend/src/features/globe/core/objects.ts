import * as THREE from "three";
import {
  atmosphereFragmentShader,
  atmosphereVertexShader,
  pointFragmentShader,
  pointVertexShader,
} from "./shaders";

function createAtmosphere(radius: number) {
  const geometry = new THREE.SphereGeometry(radius, 64, 64);

  const material = new THREE.ShaderMaterial({
    vertexShader: atmosphereVertexShader,
    fragmentShader: atmosphereFragmentShader,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
    transparent: true,
    depthWrite: false,
  });

  return new THREE.Mesh(geometry, material);
}

function createParticles(radius: number) {
  const count = 8000;
  const positions = new Float32Array(count * 3);
  const vis = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    const phi = Math.acos(1 - 2 * (i + 0.5) / count);
    const theta = Math.PI * (1 + Math.sqrt(5)) * i;

    positions[i * 3] = radius * 1.001 * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = radius * 1.001 * Math.cos(phi);
    positions[i * 3 + 2] = radius * 1.001 * Math.sin(phi) * Math.sin(theta);

    vis[i] = Math.random() > 0.42 ? 1 : 0;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("vis", new THREE.BufferAttribute(vis, 1));

  const material = new THREE.ShaderMaterial({
    vertexShader: pointVertexShader,
    fragmentShader: pointFragmentShader,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  return new THREE.Points(geometry, material);
}

function createGrid(radius: number) {
  const group = new THREE.Group();

  const dim = new THREE.LineBasicMaterial({
    color: 0xa5f3c9,
    transparent: true,
    opacity: 0.06,
  });

  const eq = new THREE.LineBasicMaterial({
    color: 0xa5f3c9,
    transparent: true,
    opacity: 0.18,
  });

  for (let lat = -80; lat <= 80; lat += 20) {
    const phi = THREE.MathUtils.degToRad(lat);
    const points: THREE.Vector3[] = [];

    for (let i = 0; i <= 128; i++) {
      const l = (i / 128) * Math.PI * 2;
      points.push(
        new THREE.Vector3(
          radius * Math.cos(phi) * Math.cos(l),
          radius * Math.sin(phi),
          radius * Math.cos(phi) * Math.sin(l)
        )
      );
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    group.add(new THREE.Line(geometry, lat === 0 ? eq : dim));
  }

  for (let lng = 0; lng < 360; lng += 20) {
    const lam = THREE.MathUtils.degToRad(lng);
    const points: THREE.Vector3[] = [];

    for (let i = 0; i <= 128; i++) {
      const p = (i / 128) * Math.PI * 2 - Math.PI;
      points.push(
        new THREE.Vector3(
          radius * Math.cos(p) * Math.cos(lam),
          radius * Math.sin(p),
          radius * Math.cos(p) * Math.sin(lam)
        )
      );
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    group.add(new THREE.Line(geometry, dim));
  }

  return group;
}

export function createGlobe(scene: THREE.Scene) {
  const group = new THREE.Group();
  scene.add(group);

  const radius = 1;

  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(radius * 0.998, 64, 64),
    new THREE.MeshStandardMaterial({
      color: 0x05100a,
      metalness: 0.05,
      roughness: 0.95,
    })
  );

  group.add(sphere);
  group.add(createGrid(radius));
  group.add(createParticles(radius));
  group.add(createAtmosphere(radius * 1.2));

  return group;
}