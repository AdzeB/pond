import { useCallback, useEffect, useState } from "react";
import { sendMessage } from "@/utils/messaging";
import { parsePairingInput } from "@/utils/pairing";
import {
  loadSettings,
  type ProbeResult,
  probe,
  saveSettings,
} from "@/utils/probe";
import { DEFAULT_SETTINGS, type PondSettings } from "@/utils/types";
import { Toolbar, type ToolbarMode } from "./Toolbar";

/** Pairing connect stays visible at least this long so the spinner reads. */
const MIN_CONNECT_MS = 2000;

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

async function waitAtLeast(startedAt: number, minMs: number): Promise<void> {
  const remaining = minMs - (Date.now() - startedAt);
  if (remaining <= 0) return;
  await new Promise<void>((resolve) => {
    window.setTimeout(resolve, remaining);
  });
}

function siteNameFromLocation(): string {
  const host = window.location.hostname.replace(/^www\./, "");
  return host || "this site";
}

function modeFromState(
  probeResult: ProbeResult | null,
  tokenValue: string,
  tokenBusy: boolean,
  tokenError: string | null,
): ToolbarMode {
  if (!probeResult || tokenBusy) return "link-loading";
  if (tokenError) return "link-error";
  if (probeResult.state === "connected") return "idle-connected";
  return tokenValue.trim() ? "link-pasted" : "link-empty";
}

/** In-page HUD: unpaired shows the token field; paired shows Capture Page. */
export function ToolbarApp({ visible }: { visible: boolean }) {
  const [probeResult, setProbeResult] = useState<ProbeResult | null>(null);
  const [tokenValue, setTokenValue] = useState("");
  const [tokenBusy, setTokenBusy] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const siteName = siteNameFromLocation();

  const refresh = useCallback(async () => {
    try {
      const settings = await withTimeout(loadSettings(), 400, DEFAULT_SETTINGS);
      const result = await probe(settings);
      setProbeResult(result);
      if (result.state === "connected") {
        setTokenError(null);
        setTokenValue("");
      }
    } catch (err) {
      console.warn("[pond] toolbar probe failed", err);
      setProbeResult({ state: "unpaired" });
    }
  }, []);

  useEffect(() => {
    if (!visible) return;
    void refresh();
  }, [visible, refresh]);

  async function applyToken(): Promise<void> {
    setTokenError(null);
    const current = await loadSettings();
    const parsed = parsePairingInput(tokenValue, current.port);
    if (!parsed) {
      setTokenError("This isn't a pairing token");
      return;
    }
    setTokenBusy(true);
    const startedAt = Date.now();
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
        setTokenError("Pond isn't running. Open the app and try again.");
      } else if (result.state === "unpaired") {
        setTokenError("Pond rejected that token. Copy a fresh one.");
      } else {
        setTokenValue("");
        setTokenError(null);
      }
    } finally {
      await waitAtLeast(startedAt, MIN_CONNECT_MS);
      setTokenBusy(false);
    }
  }

  async function capturePage(): Promise<void> {
    const url = window.location.href;
    try {
      await sendMessage("capture", { url, trigger: "toolbar" });
    } catch (err) {
      console.warn("[pond] capture failed", err);
    }
  }

  if (!visible) return null;

  const mode = modeFromState(probeResult, tokenValue, tokenBusy, tokenError);

  return (
    <div className="pond-toolbar-root">
      <Toolbar
        mode={mode}
        siteName={siteName}
        tokenValue={tokenValue}
        errorMessage={tokenError ?? undefined}
        onCapturePage={() => void capturePage()}
        onTokenChange={(value) => {
          setTokenValue(value);
          setTokenError(null);
        }}
        onTokenSubmit={() => void applyToken()}
      />
    </div>
  );
}
