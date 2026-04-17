import * as THREE from "three";

export function setupResize(
  renderer: THREE.WebGLRenderer,
  camera: THREE.PerspectiveCamera,
  canvas: HTMLCanvasElement
) {
  const resize = () => {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };

  resize();

  const observer = new ResizeObserver(resize);
  observer.observe(canvas);

  window.addEventListener("resize", resize);

  return () => {
    observer.disconnect();
    window.removeEventListener("resize", resize);
  };
}