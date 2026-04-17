import { useRef } from "react";
import { useGlobe } from "../hooks/useGlobe";

export default function GlobeCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useGlobe(canvasRef);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: "100%", height: "100%", display: "block" }}
    />
  );
}