/**
 * src/components/CountryPanel/styles.ts
 *
 * Note: s.inner.width is intentionally NOT set here.
 * The component sets it to the PANEL_WIDTH constant ("min(400px, 92vw)")
 * at runtime so both the outer wrapper and the inner div always use the
 * same value — keeping them in sync via a single source of truth.
 */

import type React from "react";

const s: Record<string, React.CSSProperties> = {
  /* ── Fixed-width inner (clipped by the animated outer) ──────────── */
  inner: {
    // width is set dynamically in index.tsx to match PANEL_WIDTH
    height: "100%",
    display: "flex",
    flexDirection: "column",
    background: "linear-gradient(160deg, #020f07 0%, #030d08 100%)",
    borderRight: "1px solid #00ff8820",
    boxShadow: "6px 0 40px #00ff8810",
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    overflow: "hidden",
  },

  /* ── Header ─────────────────────────────────────────────────────── */
  header: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    // padding is set dynamically in index.tsx based on isMobile
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
    // fontSize set dynamically in index.tsx
    fontWeight: 600,
    color: "#dffff0",
    letterSpacing: "0.03em",
    lineHeight: 1.25,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  closeBtn: {
    background: "transparent",
    border: "1px solid #00ff8830",
    borderRadius: "6px",
    color: "#00ff8877",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "8px",
    // minWidth / minHeight set dynamically in index.tsx for mobile tap target
  },

  /* ── Divider ─────────────────────────────────────────────────────── */
  divider: {
    height: "1px",
    margin: "0 20px",
    background: "linear-gradient(to right, #00ff8830, transparent)",
    flexShrink: 0,
  },

  /* ── Scrollable body ─────────────────────────────────────────────── */
  body: {
    flex: 1,
    overflowY: "auto",
    // padding set dynamically in index.tsx based on isMobile
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    scrollbarWidth: "thin",
    scrollbarColor: "#00ff8825 transparent",
  },

  /* ── Section label ───────────────────────────────────────────────── */
  sectionLabel: {
    fontSize: "8px",
    letterSpacing: "0.2em",
    color: "#00ff8855",
    marginBottom: "8px",
  },

  /* ── Feedback text (loading, error, empty) ───────────────────────── */
  feedbackText: {
    margin: 0,
    fontSize: "12px",
    lineHeight: 1.7,
    color: "#77b890",
    fontStyle: "italic",
  },

  /* ── News card ───────────────────────────────────────────────────── */
  newsCard: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    background: "#00ff880a",
    border: "1px solid #00ff8820",
    borderRadius: "6px",
    padding: "12px",
    textDecoration: "none",
    cursor: "pointer",
    transition: "background 150ms ease, border-color 150ms ease",
  },
  newsCardHover: {
    background: "#00ff8815",
    borderColor: "#00ff8840",
  },

  /* ── Headline ────────────────────────────────────────────────────── */
  newsTitle: {
    margin: 0,
    fontSize: "12px",
    fontWeight: 600,
    color: "#dffff0",
    lineHeight: 1.45,
  },

  /* ── Summary excerpt ─────────────────────────────────────────────── */
  newsDesc: {
    margin: 0,
    fontSize: "11px",
    color: "#77b890",
    lineHeight: 1.6,
    display: "-webkit-box",
    WebkitLineClamp: 3,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  },

  /* ── Publish date ────────────────────────────────────────────────── */
  newsDate: {
    fontSize: "9px",
    color: "#00ff8855",
    letterSpacing: "0.1em",
    marginTop: "2px",
  },
};

export default s;