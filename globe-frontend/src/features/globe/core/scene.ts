import * as THREE from "three";

export function createScene() {
  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 200);
  camera.position.z = 2.8;

  const ambient = new THREE.AmbientLight(0xffffff, 0.4);
  scene.add(ambient);

  const light = new THREE.DirectionalLight(0xe8f5e9, 0.9);
  light.position.set(4, 3, 5);
  scene.add(light);

  return { scene, camera };
}