import { useCallback, useEffect, useState } from "react";
import { loadSettings, type ProbeResult, probe } from "@/utils/probe";
import { DEFAULT_SETTINGS } from "@/utils/types";
import { PopupView } from "./views";

async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  fallback: T,
): Promise<T> {
  try {
    return await Promise.race([
      promise,
      new Promise<T>((resolve) => {
        window.setTimeout(() => resolve(fallback), ms);
      }),
    ]);
  } catch {
    return fallback;
  }
}

export function App() {
  const [ready, setReady] = useState(false);
  const [probeResult, setProbeResult] = useState<ProbeResult | null>(null);

  const refresh = useCallback(async () => {
    try {
      const settings = await withTimeout(loadSettings(), 400, DEFAULT_SETTINGS);
      setProbeResult(await probe(settings));
    } catch (err) {
      console.warn("[pond] app probe failed", err);
      setProbeResult({ state: "unpaired" });
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

  if (probeResult.state === "unpaired") {
    return <PopupView state="unpaired" />;
  }

  if (probeResult.state === "offline") {
    return <PopupView state="offline" onRetry={refresh} />;
  }

  return <PopupView state="connected" libraryName={probeResult.library.name} />;
}
