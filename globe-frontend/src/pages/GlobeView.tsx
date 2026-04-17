import GlobeCanvas from "../features/globe/components/GlobeCanvas";

export default function GlobeView() {
  return (
    <div style={{ width: "100vw", height: "100vh", background: "#070b10" }}>
      <GlobeCanvas />
    </div>
  );
}