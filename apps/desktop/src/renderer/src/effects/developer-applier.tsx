import { useEffect } from "react";
import { usePrefs } from "@/pool/prefs";

export function DeveloperApplier() {
  const [prefs, , ready] = usePrefs("developer");

  useEffect(() => {
    if (!ready) return;
    void window.pond.query("developer.applyVerboseLogging", {
      verbose: prefs.verboseLogging,
    });
  }, [ready, prefs.verboseLogging]);

  return null;
}
