/**
 * src/pages/GlobeView.tsx
 *
 * Orchestrates GlobeThree + Panel.
 *
 * Close animation contract:
 *
 *   X button path  (already worked):
 *     Panel.handleClose() → setOpen(false) → animation
 *       → setTimeout(onClose, 350) → handlePanelClose() → setSelectedCountry(null)
 *
 *   Ocean click path (was broken — fixed here):
 *     onCountrySelect(null) → setClosingPanel(true) — selectedCountry stays set,
 *     Panel stays mounted, triggerClose prop flips true
 *       → Panel animates out → calls onClose
 *         → handlePanelClose() → setSelectedCountry(null) + setClosingPanel(false)
 *
 * URL strategy — query param under the existing /globe route:
 *   /globe?country=UnitedStatesofAmerica
 *   Reloads still match <Route path="/globe">, restoring the open panel.
 */

import { useState, useCallback, useEffect } from "react";
import GlobeThree   from "../components/GlobeThree";
import Panel from "../components/Panel";

function toSlug(name: string): string {
  return name.replace(/\s+/g, "").replace(/[^a-zA-Z0-9]/g, "");
}

function readSlugFromUrl(): string | null {
  const param = new URLSearchParams(window.location.search).get("country");
  return param ? decodeURIComponent(param) : null;
}

export default function GlobeView() {
  const [selectedCountry, setSelectedCountry] = useState<string | null>(
    readSlugFromUrl
  );
  /**
   * When true, Panel is still mounted (so it can animate) but its
   * triggerClose prop is set — it will call onClose after the slide-out
   * finishes, at which point we finally unmount it.
   */
  const [closingPanel, setClosingPanel] = useState(false);

  const handleCountrySelect = useCallback((name: string | null) => {
    if (name) {
      // New country selected — cancel any in-progress close, show new panel
      setClosingPanel(false);
      setSelectedCountry(name);
      window.history.pushState(
        { country: name },
        "",
        `/globe?country=${toSlug(name)}`
      );
    } else {
      // Deselected (ocean click) — trigger animated close, keep mounted for now
      setClosingPanel(true);
      window.history.pushState({}, "", "/globe");
    }
  }, []);

  /** Called by Panel after its slide-out animation completes */
  const handlePanelClose = useCallback(() => {
    setSelectedCountry(null);
    setClosingPanel(false);
    window.history.pushState({}, "", "/globe");
  }, []);

  // Sync with browser back/forward
  useEffect(() => {
    const onPopState = (e: PopStateEvent) => {
      const country = (e.state as { country?: string })?.country ?? null;
      setSelectedCountry(country);
      setClosingPanel(false);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
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
      {selectedCountry && (
        <Panel
          country={selectedCountry}
          triggerClose={closingPanel}
          onClose={handlePanelClose}
        />
      )}

      <div style={{ position: "relative", flex: 1, minWidth: 0, height: "100%" }}>
        <GlobeThree
            onCountrySelect={handleCountrySelect}
            selectedCountry={selectedCountry}
          />
      </div>
    </div>
  );
}