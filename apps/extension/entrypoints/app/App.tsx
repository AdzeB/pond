import { useCallback, useEffect, useState } from "react";
import { type ProbeResult, probe } from "@/utils/probe";
import { PopupView } from "./views";

export function App() {
  const [ready, setReady] = useState(false);
  const [probeResult, setProbeResult] = useState<ProbeResult | null>(null);

  const refresh = useCallback(async () => {
    try {
      setProbeResult(await probe());
    } catch (err) {
      console.warn("[pond] app probe failed", err);
      setProbeResult({ state: "offline" });
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (!ready || !probeResult) {
    return <PopupView state="loading" />;
  }

  if (probeResult.state === "offline") {
    return <PopupView state="offline" onRetry={refresh} />;
  }

  return <PopupView state="connected" libraryName={probeResult.library.name} />;
}
