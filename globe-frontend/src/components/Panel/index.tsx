/**
 * src/components/Panel/index.tsx
 *
 * Sliding side-panel that displays live news for the selected country.
 *
 * Data flow:
 *   GlobeThree → onCountrySelect(name) → GlobeView (state) → CountryPanel (prop)
 *   CountryPanel → fetchCountryNews(name) → Django /api/news/<slug>/
 *   Django JSON array → NewsArticle[] → rendered news cards
 */

import { useEffect, useRef, useState } from "react";
import type { NewsArticle, NewsState } from "../../types/rss";
import { fetchCountryNews } from "../../services/newsService";
import type { CountryPanelProps } from "./types";
import s from "./styles";

/* ── Helpers ──────────────────────────────────────────────────────────── */

function formatDate(d: Date): string {
  return d.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* ── Sub-components ───────────────────────────────────────────────────── */

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

/* ── Main component ───────────────────────────────────────────────────── */

export default function Panel({ country, onClose }: CountryPanelProps) {
  /* ── Slide animation ──────────────────────────────────────────────── */
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setOpen(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const handleClose = () => {
    setOpen(false);
    setTimeout(onClose, 350);
  };

  /* ── News fetch ───────────────────────────────────────────────────── */
  const [newsState, setNewsState] = useState<NewsState>({ status: "idle" });
  const fetchedForRef = useRef<string | null>(null);

  useEffect(() => {
    setNewsState({ status: "loading" });
    fetchedForRef.current = country;

    fetchCountryNews(country)
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

  /* ── Render ───────────────────────────────────────────────────────── */
  return (
    <div
      style={{
        width: open ? "40%" : "0px",
        minWidth: 0,
        height: "100%",
        overflow: "hidden",
        flexShrink: 0,
        transition: "width 350ms cubic-bezier(0.22, 1, 0.36, 1)",
      }}
    >
      <div style={s.inner}>

        <div style={s.header}>
          <div style={s.accent} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={s.eyebrow}>REGION SELECTED</div>
            <h2 style={s.title}>{country}</h2>
          </div>
          <button onClick={handleClose} style={s.closeBtn} aria-label="Close panel">
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

        <div style={s.body}>
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