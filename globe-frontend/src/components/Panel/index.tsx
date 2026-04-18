/**
 * src/components/Panel/index.tsx
 */

import { useEffect, useRef, useState } from "react";
import type { NewsArticle, NewsState } from "../../types/rss";
import { fetchCountryNews } from "../../services/newsService";
import type { CountryPanelProps } from "./types";
import s from "./styles";
import { getCountryNews } from "../../repositories/newRepo"

/* ─── Constants ──────────────────────────────────────────────────────── */

/** Must match the open-width in the outer wrapper below AND s.inner.width */
const PANEL_WIDTH = "min(400px, 92vw)";

/** Matches the CSS transition duration in ms */
const SLIDE_DURATION = 350;

/* ─── Helpers ────────────────────────────────────────────────────────── */

function formatDate(d: Date): string {
  return d.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Returns true when the viewport is narrower than 480 px.
 * Updates on resize so the panel reflows without a page reload.
 */
function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(() => window.innerWidth < 480);
  useEffect(() => {
    const handler = () => setMobile(window.innerWidth < 480);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return mobile;
}

/* ─── Sub-components ─────────────────────────────────────────────────── */

function NewsCard({ article }: { article: NewsArticle }) {
  const [hovered, setHovered] = useState(false);

  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      style={{ ...s.newsCard, ...(hovered ? s.newsCardHover : {}) }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <p style={s.newsTitle}>{article.title}</p>

      {article.description && article.description !== article.title && (
        <p style={s.newsDesc}>{article.description}</p>
      )}

      {article.publishedAt && (
        <span style={s.newsDate}>{formatDate(article.publishedAt)}</span>
      )}
    </a>
  );
}

function LoadingState() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          style={{
            ...s.newsCard,
            opacity: 0.4,
            height: "80px",
            animation: "pulse 1.4s ease-in-out infinite",
          }}
        />
      ))}
    </div>
  );
}

/* ─── Main component ─────────────────────────────────────────────────── */

export default function Panel({
  country,
  triggerClose,
  onClose,
}: CountryPanelProps) {
  const isMobile = useIsMobile();

  /* ── Slide animation ────────────────────────────────────────────── */
  const [open, setOpen] = useState(false);

  // Slide in on mount
  useEffect(() => {
    const id = requestAnimationFrame(() => setOpen(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // X button: panel drives its own close
  const handleClose = () => {
    setOpen(false);
    setTimeout(onClose, SLIDE_DURATION);
  };

  // External trigger (e.g. ocean click): parent asks us to animate out
  useEffect(() => {
    if (!triggerClose) return;
    setOpen(false);
    const id = setTimeout(onClose, SLIDE_DURATION);
    return () => clearTimeout(id);
  }, [triggerClose]);

  /* ── News fetch ─────────────────────────────────────────────────── */
  const [newsState, setNewsState] = useState<NewsState>({ status: "idle" });
  const fetchedForRef = useRef<string | null>(null);

  useEffect(() => {
    setNewsState({ status: "loading" });
    fetchedForRef.current = country;

    getCountryNews(country) // calling to Repo layer insteas of service
      .then((articles) => {
        if (fetchedForRef.current !== country) return;
        setNewsState({ status: "success", articles });
      })
      .catch((err: unknown) => {
        if (fetchedForRef.current !== country) return;
        const message = err instanceof Error ? err.message : "Unknown error";
        setNewsState({ status: "error", message });
      });
  }, [country]);

  /* ── Responsive overrides ───────────────────────────────────────── */
  const headerPadding = isMobile ? "16px 12px 12px" : "28px 20px 20px";
  const bodyPadding   = isMobile ? "12px" : "20px";
  const titleSize     = isMobile ? "14px" : "17px";
  const closeBtnSize  = isMobile ? "32px" : "auto";   // minimum tap target

  /* ── Render ─────────────────────────────────────────────────────── */
  return (
    /*
     * Outer: animates width 0 → PANEL_WIDTH.
     * overflow:hidden clips the fixed-width inner — this is what creates
     * the slide effect instead of a squash.
     */
    <div
      style={{
        width: open ? PANEL_WIDTH : "0px",
        minWidth: 0,
        height: "100%",
        overflow: "hidden",
        flexShrink: 0,
        transition: `width ${SLIDE_DURATION}ms cubic-bezier(0.22, 1, 0.36, 1)`,
      }}
    >
      {/* Inner: fixed width so it is clipped, never squashed */}
      <div style={{ ...s.inner, width: PANEL_WIDTH }}>

        <div style={{ ...s.header, padding: headerPadding }}>
          <div style={s.accent} />

          {/* Title block — min-width:0 lets the ellipsis truncation work */}
          <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
            <div style={s.eyebrow}>REGION SELECTED</div>
            <h2 style={{ ...s.title, fontSize: titleSize }}>{country}</h2>
          </div>

          {/*
           * Close button — explicit minWidth/minHeight guarantees a
           * reachable tap target on mobile regardless of panel width.
           */}
          <button
            onClick={handleClose}
            style={{
              ...s.closeBtn,
              minWidth: closeBtnSize,
              minHeight: closeBtnSize,
              flexShrink: 0,
            }}
            aria-label="Close panel"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M1 1L13 13M13 1L1 13"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <div style={s.divider} />

        <div style={{ ...s.body, padding: bodyPadding }}>
          <div style={s.sectionLabel}>LATEST NEWS</div>

          {newsState.status === "idle" && (
            <p style={s.feedbackText}>Select a country to load news.</p>
          )}

          {newsState.status === "loading" && <LoadingState />}

          {newsState.status === "error" && (
            <p style={{ ...s.feedbackText, color: "#ff6b6b" }}>
              {newsState.message}
            </p>
          )}

          {newsState.status === "success" && (
            newsState.articles.length === 0
              ? <p style={s.feedbackText}>No news articles found.</p>
              : newsState.articles.map((article) => (
                  <NewsCard key={article.id} article={article} />
                ))
          )}
        </div>
      </div>
    </div>
  );
}