import { useEffect, useState } from "react";

interface CountryPanelProps {
  /** Raw country name from GlobeThree (e.g. "United States of America") */
  country: string;
  onClose: () => void;
}

export default function CountryPanel({ country, onClose }: CountryPanelProps) {
  // Drives the CSS transition: false = 0px wide, true = 360px wide
  const [open, setOpen] = useState(false);

  // Slide in on mount
  useEffect(() => {
    const id = requestAnimationFrame(() => setOpen(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Slide out, then notify parent so it can unmount us
  const handleClose = () => {
    setOpen(false);
    setTimeout(onClose, 350); // matches transition duration
  };

  return (
    <div
      style={{
        // The sliding container — width animates 0 → 360px
        width: open ? "40%" : "0px",
        minWidth: 0,
        height: "100%",
        overflow: "hidden",
        flexShrink: 0,
        transition: "width 350ms cubic-bezier(0.22, 1, 0.36, 1)",
      }}
    >
      {/* Fixed-width inner so contents don't squash during the transition */}
      <div style={s.inner}>

        <div style={s.header}>
          <div style={s.accent} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={s.eyebrow}>REGION SELECTED</div>
            <h2 style={s.title}>{country}</h2>
          </div>
          <button onClick={handleClose} style={s.closeBtn} aria-label="Close">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 1L13 13M13 1L1 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <div style={s.divider} />

        {/* ── Content area — populate from backend here ── */}
        <div style={s.body}>

          {/* Placeholder stat cards */}
          <div style={s.grid}>
            {(["CAPITAL", "POPULATION", "AREA", "CURRENCY"] as const).map(label => (
              <div key={label} style={s.card}>
                <span style={s.cardLabel}>{label}</span>
                <span style={s.cardValue}>—</span>
              </div>
            ))}
          </div>

          {/* Placeholder link list — swap with your backend content */}
          <div style={s.section}>
            <div style={s.sectionLabel}>LINKS</div>
            <div style={s.linkList}>
              {/* e.g. map over backend links here */}
              <div style={s.linkPlaceholder}>No links yet</div>
            </div>
          </div>

          <div style={s.section}>
            <div style={s.sectionLabel}>OVERVIEW</div>
            <p style={s.body_text}>Loading…</p>
          </div>

        </div>
      </div>
    </div>
  );
}

/* ── Styles ─────────────────────────────────────────────────────────────── */
const s: Record<string, React.CSSProperties> = {
  inner: {
    width: "100%",
    height: "100%",
    display: "flex",
    flexDirection: "column",
    background: "linear-gradient(160deg, #020f07 0%, #030d08 100%)",
    borderRight: "1px solid #00ff8820",
    boxShadow: "6px 0 40px #00ff8810",
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    overflow: "hidden",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "28px 20px 20px",
  },
  accent: {
    width: "3px",
    height: "44px",
    flexShrink: 0,
    borderRadius: "2px",
    background: "linear-gradient(to bottom, #00ff88, #00ccff55)",
    boxShadow: "0 0 10px #00ff8877",
  },
  eyebrow: {
    fontSize: "9px",
    letterSpacing: "0.2em",
    color: "#00ff8855",
    marginBottom: "4px",
  },
  title: {
    margin: 0,
    fontSize: "17px",
    fontWeight: 600,
    color: "#dffff0",
    letterSpacing: "0.03em",
    lineHeight: 1.25,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  closeBtn: {
    flexShrink: 0,
    background: "transparent",
    border: "1px solid #00ff8830",
    borderRadius: "6px",
    color: "#00ff8877",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "8px",
  },
  divider: {
    height: "1px",
    margin: "0 20px",
    background: "linear-gradient(to right, #00ff8830, transparent)",
  },
  body: {
    flex: 1,
    overflowY: "auto",
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "24px",
    scrollbarWidth: "thin",
    scrollbarColor: "#00ff8825 transparent",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "8px",
  },
  card: {
    background: "#00ff880a",
    border: "1px solid #00ff8820",
    borderRadius: "6px",
    padding: "12px",
    display: "flex",
    flexDirection: "column",
    gap: "5px",
  },
  cardLabel: {
    fontSize: "8px",
    letterSpacing: "0.18em",
    color: "#00ff8855",
  },
  cardValue: {
    fontSize: "14px",
    color: "#99ffcc",
    fontWeight: 500,
  },
  section: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  sectionLabel: {
    fontSize: "8px",
    letterSpacing: "0.2em",
    color: "#00ff8855",
  },
  linkList: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  linkPlaceholder: {
    fontSize: "12px",
    color: "#00ff8840",
    fontStyle: "italic",
  },
  body_text: {
    margin: 0,
    fontSize: "12px",
    lineHeight: 1.7,
    color: "#77b890",
  },
};