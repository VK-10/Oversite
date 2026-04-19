/**
 * src/components/SearchBar/index.tsx
 *
 * On mobile (< 480 px wide), the panel takes ~92 vw leaving no space for the
 * search bar without overlapping the panel's close button.  When `panelOpen`
 * is true on a mobile viewport the component returns null — the user can close
 * the panel first, then search again.  On desktop the bar is always visible
 * and shifts right naturally because it lives inside the inner globe div.
 */

import { useEffect, useRef, useState } from "react";
import s from "./styles";

interface SearchBarProps {
  countryNames: string[];
  onSelect: (name: string) => void;
  /** True while a country panel is open. Used to hide bar on mobile. */
  panelOpen: boolean;
}

const MAX_RESULTS = 8;

/** Returns true when the viewport is narrower than 480 px. */
function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(() => window.innerWidth < 480);
  useEffect(() => {
    const handler = () => setMobile(window.innerWidth < 480);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return mobile;
}

export default function SearchBar({ countryNames, onSelect, panelOpen }: SearchBarProps) {
  const isMobile = useIsMobile();

  const [query,        setQuery]        = useState("");
  const [open,         setOpen]         = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLInputElement>(null);

  /* On mobile, hide the search bar while the panel is open — there is no
   * room for it without overlapping the panel's close button.           */
  if (isMobile && panelOpen) return null;

  const filtered = query.trim().length === 0
    ? []
    : countryNames
        .filter((n) => n.toLowerCase().includes(query.toLowerCase()))
        .slice(0, MAX_RESULTS);

  const handleSelect = (name: string) => {
    setQuery(name);
    setOpen(false);
    setHighlightIdx(-1);
    onSelect(name);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") { setOpen(false); return; }
    if (!open || filtered.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIdx((i) => (i + 1) % filtered.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIdx((i) => (i <= 0 ? filtered.length - 1 : i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightIdx >= 0) handleSelect(filtered[highlightIdx]);
      else if (filtered.length === 1) handleSelect(filtered[0]);
    }
  };

  return (
    <div ref={wrapperRef} style={s.wrapper}>
      <div style={s.inputRow}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"
          style={{ color: "#00ff8866", flexShrink: 0 }}>
          <circle cx="5.5" cy="5.5" r="4" stroke="currentColor" strokeWidth="1.5" />
          <path d="M9 9l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>

        <input
          ref={inputRef}
          style={s.input}
          placeholder="Search country…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setHighlightIdx(-1);
          }}
          onFocus={() => { if (query.trim().length > 0) setOpen(true); }}
          onKeyDown={handleKeyDown}
        />

        {query && (
          <button style={s.clearBtn} aria-label="Clear search"
            onMouseDown={(e) => {
              e.preventDefault();
              setQuery(""); setOpen(false); setHighlightIdx(-1);
              inputRef.current?.focus();
            }}>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M1 1l8 8M9 1L1 9" stroke="currentColor"
                strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>

      {open && query.trim().length > 0 && (
        <div style={s.dropdown}>
          {filtered.length === 0
            ? <div style={s.empty}>No countries match "{query}"</div>
            : filtered.map((name, i) => (
                <div key={name}
                  style={{ ...s.item, ...(i === highlightIdx ? s.itemHighlighted : {}) }}
                  onMouseEnter={() => setHighlightIdx(i)}
                  onMouseLeave={() => setHighlightIdx(-1)}
                  onMouseDown={(e) => { e.preventDefault(); handleSelect(name); }}>
                  {name}
                </div>
              ))
          }
        </div>
      )}
    </div>
  );
}