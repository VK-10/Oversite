/**
 * src/components/CountryPanel/types.ts
 *
 * Props and local state types owned by CountryPanel.
 * Keeping these in a separate file lets you import them into
 * tests, Storybook stories, or parent components without pulling
 * in the full React component tree.
 */

export interface CountryPanelProps {
  /**
   * Raw country name as returned by GlobeThree's onCountrySelect callback,
   * e.g. "United States of America", "Germany", "India".
   */
  country: string;

  /** Called once the slide-out animation finishes so the parent can unmount. */
  onClose: () => void;
}