import * as THREE from "three";

export function startAnimation(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
  globe: THREE.Group
) {
  let frameId = 0;

  const loop = () => {
    globe.rotation.y += 0.0015;
    renderer.render(scene, camera);
    frameId = requestAnimationFrame(loop);
  };

  loop();

  return () => cancelAnimationFrame(frameId);
}