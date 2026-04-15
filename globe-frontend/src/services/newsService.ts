/**
 * src/services/newsService.ts
 *
 * Single responsibility: fetch the JSON article list from Django and
 * return a typed NewsArticle array ready for CountryPanel to render.
 *
 * Django endpoint contract (adjust BASE_URL / path to match your urls.py):
 *   GET /api/news/<country_slug>/
 *   Response: application/json — array of article objects, e.g.:
 *   [
 *     {
 *       "id": "fcb06e10-…",
 *       "title": "…",
 *       "description": "…",
 *       "published_at": "2026-04-13T08:57:09+05:30",
 *       "url": "https://…",
 *       "feed": "dd24aa86-…"
 *     },
 *     …
 *   ]
 *
 * The country slug is the GeoJSON name with spaces → underscores,
 * e.g. "United States of America" → "United_States_of_America".
 */

import type { NewsArticle } from "../types/rss";

/** Change to "http://localhost:8000" if Django runs on a different port */
const BASE_URL = import.meta.env.VITE_BACKEND_URI || "http://localhost:8000";

function buildUrl(country: string): string {
  const slug = country.replace(/\s+/g, "_").toLowerCase();
  return `${BASE_URL}/news/?name=world-countries&subname=${encodeURIComponent(slug)}/`;

}

/**
 * Django sometimes stores "0001-01-01 00:00:00" as a sentinel for an
 * unknown publish date.  We treat that — and any other unparseable string —
 * as null rather than surfacing a bogus date in the UI.
 */
function parsePublishedAt(raw: string): Date | null {
  if (!raw || raw.startsWith("0001-01-01")) return null;
  const ts = Date.parse(raw);
  return isNaN(ts) ? null : new Date(ts);
}

/** Raw shape coming off the wire — no publishedAt yet */
interface RawArticle {
  id: string;
  title: string;
  description: string;
  published_at: string;
  url: string;
  feed: string;
}

function normalise(raw: RawArticle): NewsArticle {
  return {
    ...raw,
    publishedAt: parsePublishedAt(raw.published_at),
  };
}

/**
 * Fetch articles for a country from the Django backend.
 * Throws on network error or non-2xx HTTP status.
 */
export async function fetchCountryNews(country: string): Promise<NewsArticle[]> {
  const url = buildUrl(country);

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch news for "${country}" — HTTP ${response.status}`
    );
  }

  const raw: RawArticle[] = await response.json();

  if (!Array.isArray(raw)) {
    throw new Error("Unexpected response format from server (expected an array)");
  }

  return raw.map(normalise);
}
