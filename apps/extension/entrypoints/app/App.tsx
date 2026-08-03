import { useCallback, useEffect, useState } from "react";
import { parsePairingInput } from "@/utils/pairing";
import {
  loadSettings,
  type ProbeResult,
  probe,
  saveSettings,
} from "@/utils/probe";
import { DEFAULT_SETTINGS, type PondSettings } from "@/utils/types";
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
  const [tokenInput, setTokenInput] = useState("");
  const [tokenBusy, setTokenBusy] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);

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

  async function applyToken(): Promise<void> {
    setTokenError(null);
    const current = await loadSettings();
    const parsed = parsePairingInput(tokenInput, current.port);
    if (!parsed) {
      setTokenError("That doesn't look like a Pond pairing token.");
      return;
    }
    setTokenBusy(true);
    try {
      const next: PondSettings = {
        ...current,
        port: parsed.port,
        apiKey: parsed.token,
      };
      await saveSettings(next);
      const result = await probe(next);
      setProbeResult(result);
      if (result.state === "offline") {
        setTokenError(
          "Linked, but Pond isn't responding. Make sure the app is running.",
        );
      } else if (result.state === "unpaired") {
        setTokenError("Pond rejected that token. Copy a fresh one.");
      } else {
        setTokenInput("");
      }
    } finally {
      setTokenBusy(false);
    }
  }

  if (!ready || !probeResult) {
    return <PopupView state="loading" />;
  }

  if (probeResult.state === "unpaired") {
    return (
      <PopupView
        state="unpaired"
        value={tokenInput}
        onChange={setTokenInput}
        onContinue={applyToken}
        busy={tokenBusy}
        error={tokenError}
      />
    );
  }

  if (probeResult.state === "offline") {
    return <PopupView state="offline" onRetry={refresh} />;
  }

  return <PopupView state="connected" libraryName={probeResult.library.name} />;
}
