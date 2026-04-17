import { Link } from "react-router-dom";

export default function LandingPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#070b10", color: "#f8fafc", padding: "48px" }}>
      <h1 style={{ fontSize: "48px", fontWeight: 300, marginBottom: "16px" }}>
        The world's events, mapped and live
      </h1>

      <p style={{ maxWidth: "560px", lineHeight: 1.7, color: "rgba(248,250,252,0.65)", marginBottom: "24px" }}>
        Click any country on the globe to surface curated news, regional signals, and geopolitical context.
      </p>

      <Link
        to="/globe"
        style={{
          display: "inline-block",
          padding: "12px 20px",
          borderRadius: "10px",
          background: "#a5f3c9",
          color: "#070b10",
          textDecoration: "none",
          fontWeight: 500,
        }}
      >
        Explore the globe
      </Link>
    </div>
  );
}