/**
 * src/pages/GlobeView.tsx
 *
 * SearchBar is inside the inner globe div so that on PC it centres within
 * the globe area and shifts right when the panel opens — the desired behaviour.
 * On mobile when the panel is open, SearchBar renders null internally
 * (via the panelOpen prop) because there is no room without covering the
 * panel's close button.
 */

import { useState, useCallback, useEffect, useRef } from "react";
import GlobeThree from "../components/GlobeThree";
import Panel      from "../components/Panel";
import SearchBar  from "../components/SearchBar";

function toSlug(name: string): string {
  return name.replace(/\s+/g, "").replace(/[^a-zA-Z0-9]/g, "");
}

function readSlugFromUrl(): string | null {
  const param = new URLSearchParams(window.location.search).get("country");
  return param ? decodeURIComponent(param) : null;
}

export default function GlobeView() {
  const [selectedCountry, setSelectedCountry] = useState<string | null>(readSlugFromUrl);
  const [closingPanel,    setClosingPanel]    = useState(false);
  const [countryNames,    setCountryNames]    = useState<string[]>([]);
  const [jumpRequest,     setJumpRequest]     = useState<{ country: string; seq: number } | null>(null);
  const jumpSeq = useRef(0);

  const handleCountrySelect = useCallback((name: string | null) => {
    if (name) {
      setClosingPanel(false);
      setSelectedCountry(name);
      window.history.pushState({ country: name }, "", `/globe?country=${toSlug(name)}`);
    } else {
      setClosingPanel(true);
      window.history.pushState({}, "", "/globe");
    }
  }, []);

  const handlePanelClose = useCallback(() => {
    setSelectedCountry(null);
    setClosingPanel(false);
    window.history.pushState({}, "", "/globe");
  }, []);

  const handleSearchSelect = useCallback((name: string) => {
    handleCountrySelect(name);
    setJumpRequest({ country: name, seq: ++jumpSeq.current });
  }, [handleCountrySelect]);

  useEffect(() => {
    const onPopState = (e: PopStateEvent) => {
      const country = (e.state as { country?: string })?.country ?? null;
      setSelectedCountry(country);
      setClosingPanel(false);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const panelOpen = !!selectedCountry;

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
      {selectedCountry && (
        <Panel
          country={selectedCountry}
          triggerClose={closingPanel}
          onClose={handlePanelClose}
        />
      )}

      {/* Inner globe div — SearchBar lives here so it shifts right
          with the globe on PC when the panel opens.                */}
      <div style={{ position: "relative", flex: 1, minWidth: 0, height: "100%" }}>
        <SearchBar
          countryNames={countryNames}
          onSelect={handleSearchSelect}
          panelOpen={panelOpen}
        />
        <GlobeThree
          onCountrySelect={handleCountrySelect}
          selectedCountry={selectedCountry}
          jumpRequest={jumpRequest}
          onCountriesLoaded={setCountryNames}
        />
      </div>
    </div>
  );
}