"use client";

import { useEffect } from "react";

/**
 * Loads react-scan in development so re-renders are visible while profiling.
 * NEXT_PUBLIC_REACT_SCAN=0 turns it off for everyone, and
 * `localStorage["summary-ui.react-scan"] = "off"` for one browser; production
 * builds never include it.
 */
export function ReactScan() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "development" || process.env.NEXT_PUBLIC_REACT_SCAN === "0") return;
    try {
      if (localStorage.getItem("summary-ui.react-scan") === "off") return;
    } catch {
      // storage unavailable: load it
    }
    void import("react-scan").then((rs) => rs.scan({ enabled: true, showToolbar: true }));
  }, []);
  return null;
}
