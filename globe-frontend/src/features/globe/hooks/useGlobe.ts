import { useEffect, type RefObject } from "react";
import * as THREE from "three";
import { createScene } from "../core/scene";
import { createRenderer } from "../core/renderer";
import { createGlobe } from "../core/objects";
import { startAnimation } from "../core/animation";
import { setupResize } from "../core/resize";

export function useGlobe(canvasRef: RefObject<HTMLCanvasElement | null>) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const { scene, camera } = createScene();
    const renderer = createRenderer(canvas);
    const globe = createGlobe(scene);

    const cleanupResize = setupResize(renderer, camera, canvas);
    const stopAnimation = startAnimation(renderer, scene, camera, globe);

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handleClick = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();

      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);

      const intersects = raycaster.intersectObject(globe, true);

      if (intersects.length > 0) {
        console.log("Clicked object:", intersects[0].object);
      }
    };

    canvas.addEventListener("click", handleClick);

    return () => {
      canvas.removeEventListener("click", handleClick);
      cleanupResize();
      stopAnimation();
      renderer.dispose();
    };
  }, [canvasRef]);
}