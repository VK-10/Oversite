/**
 * src/types/rss.ts
 */

/** Shape of a single object in the Django JSON array */
export interface NewsArticle {
  id: string;
  title: string;
  description: string;
  /** ISO-8601 string as returned by Django, e.g. "2026-04-13T08:57:09+05:30".
   *  Django may return the sentinel "0001-01-01 00:00:00" when the date is
   *  unknown — the service normalises this to null via publishedAt. */
  published_at: string;
  url: string;
  /** UUID of the feed source this article belongs to */
  feed: string;
  /** Parsed Date derived from published_at — null when date is invalid/sentinel */
  publishedAt: Date | null;
  country: string; /*added for indexing and querying the indexedDB */
}

/** Discriminated union used by CountryPanel to track request state */
export type NewsState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; articles: NewsArticle[] }
  | { status: "error"; message: string };