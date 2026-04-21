/**
 * src/components/SearchBar/styles.ts
 *
 * Positioned at the top-centre of whatever container it is placed in.
 * GlobeView places SearchBar inside the inner globe div, so on PC it
 * centres in the globe area and shifts right when the panel opens —
 * exactly the desired behaviour.
 * On mobile when the panel is open, SearchBar renders null (see index.tsx).
 */

import type React from "react";

const s: Record<string, React.CSSProperties> = {
  wrapper: {
    position: "absolute",
    top: "16px",
    left: "50%",
    transform: "translateX(-50%)",
    zIndex: 20,
    width: "min(320px, calc(100% - 32px))",
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
  },

  inputRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    background: "rgba(1, 14, 7, 0.90)",
    border: "1px solid #00ff8840",
    borderRadius: "6px",
    padding: "0 12px",
    backdropFilter: "blur(10px)",
    boxShadow: "0 4px 24px rgba(0,0,0,0.6), 0 0 0 1px #00ff8812",
  },

  input: {
    flex: 1,
    background: "transparent",
    border: "none",
    outline: "none",
    color: "#dffff0",
    fontSize: "13px",
    letterSpacing: "0.04em",
    padding: "11px 0",
    fontFamily: "inherit",
    minWidth: 0,
  },

  clearBtn: {
    background: "transparent",
    border: "none",
    color: "#00ff8866",
    cursor: "pointer",
    padding: "4px",
    display: "flex",
    alignItems: "center",
    flexShrink: 0,
  },

  dropdown: {
    marginTop: "4px",
    background: "rgba(1, 14, 7, 0.95)",
    border: "1px solid #00ff8825",
    borderRadius: "6px",
    overflow: "hidden",
    backdropFilter: "blur(12px)",
    boxShadow: "0 8px 32px rgba(0,0,0,0.7)",
    maxHeight: "260px",
    overflowY: "auto" as const,
    scrollbarWidth: "thin" as const,
    scrollbarColor: "#00ff8820 transparent",
  },

  item: {
    padding: "10px 14px",
    fontSize: "12px",
    color: "#99ffcc",
    letterSpacing: "0.04em",
    cursor: "pointer",
    borderBottom: "1px solid #00ff880d",
    transition: "background 100ms ease",
    userSelect: "none" as const,
  },

  itemHighlighted: {
    background: "#00ff8818",
    color: "#dffff0",
  },

  empty: {
    padding: "12px 14px",
    fontSize: "12px",
    color: "#00ff8840",
    fontStyle: "italic",
  },
};

export default s;