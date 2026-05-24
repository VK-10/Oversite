/**
 * src/components/CountryPanel/types.ts
 */

import type { NewsArticle } from "../../types/rss";


export interface CountryPanelProps {
  /**
   * Raw country name as returned by GlobeThree's onCountrySelect callback,
   * e.g. "United States of America", "Germany", "India".
   */
  country: string;

  /**
   * When the parent flips this to true (e.g. user clicks ocean / deselects
   * via the globe), CountryPanel starts its slide-out animation and calls
   * onClose when the transition finishes.
   * The X button uses its own internal close path — this prop is purely
   * for external triggers that don't go through the button.
   */
  triggerClose?: boolean;

  /** Called once the slide-out animation finishes so the parent can unmount. */

  // onContextChange? : (ctx:{ country? : string; articles: NewsArticle[];}) => void
  onOpenAgent?: (article: NewsArticle) => void;
  onClose: () => void;
}