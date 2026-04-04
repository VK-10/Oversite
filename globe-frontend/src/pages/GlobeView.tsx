/**
 * GlobeView.tsx
 *
 * Drop this wherever you currently render <GlobeThree />.
 * No router setup needed — it manages panel state internally
 * and uses window.history.pushState for URL sync.
 *
 * URL behaviour:
 *   - Click "United States of America" → URL becomes /UnitedStatesofAmerica
 *   - Close panel / click globe background → URL returns to /
 *   - Works with or without React Router in the project.
 *   - If you DO use React Router, just swap the pushState calls
 *     for navigate() — the state logic is identical.
 */

import { useState, useCallback } from "react";
import GlobeThree   from "../components/GlobeThree";
import CountryPanel from "../components/CountryPanel";

/* Strip spaces and non-alphanumeric chars for clean URL slugs.
   "United States of America" → "UnitedStatesofAmerica"          */
function toSlug(name: string): string {
  return name.replace(/\s+/g, "").replace(/[^a-zA-Z0-9]/g, "");
}

export default function GlobeView() {
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);

  const handleCountrySelect = useCallback((name: string | null) => {
    if (name) {
      setSelectedCountry(name);
      window.history.pushState({ country: name }, "", `/${toSlug(name)}`);
    } else {
      setSelectedCountry(null);
      window.history.pushState({}, "", "/");
    }
  }, []);

  const handlePanelClose = useCallback(() => {
    setSelectedCountry(null);
    window.history.pushState({}, "", "/");
  }, []);

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        display: "flex",
        overflow: "hidden",
      }}
    >
      {/* Panel mounts/unmounts based on selection.
          CountryPanel handles its own slide-in/out transition internally
          and calls onClose once the slide-out animation finishes.         */}
      {selectedCountry && (
        <CountryPanel
          country={selectedCountry}
          onClose={handlePanelClose}
        />
      )}

      {/* Globe fills the remaining space. The flex layout naturally
          shrinks it when the panel slides in.                       */}
      <div style={{ position: "relative", flex: 1, minWidth: 0, height: "100%" }}>
        <GlobeThree onCountrySelect={handleCountrySelect} />
      </div>
    </div>
  );
}