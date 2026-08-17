import { useCallback, useEffect, useRef, useState } from "react";
import { sendMessage } from "@/utils/messaging";
import { parsePairingInput } from "@/utils/pairing";
import { loadSettings, type ProbeResult, saveSettings } from "@/utils/probe";
import { DEFAULT_SETTINGS, type PondSettings } from "@/utils/types";
import { Toolbar, type ToolbarMode } from "./Toolbar";

/** Pairing connect stays visible at least this long so the spinner reads. */
const MIN_CONNECT_MS = 2000;

/** Matches `--ds-duration-emphasized` in host.css. */
const SHELL_ENTER_MS = 250;

/** Brief capture/action errors clear so the HUD can return to Capture Page. */
const ACTION_ERROR_MS = 3200;

/** Pairing errors clear so the token field returns for another try. */
const TOKEN_ERROR_MS = 2800;

const COPY = {
  offline: "Pond isn't running. Open the app and try again.",
  rejected: "Pond rejected that token. Copy a fresh one.",
  expired: "Session expired. Paste a fresh pairing token.",
  invalid: "This isn't a pairing token",
  capture: "Couldn't capture this page. Try again.",
} as const;

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
  verifyingSession: boolean,
  actionError: string | null,
): ToolbarMode {
  if (tokenBusy || verifyingSession) return "link-loading";
  if (tokenError) return "link-error";
  if (actionError) return "action-error";
  if (probeResult?.state === "connected") return "idle-connected";
  if (probeResult?.state === "offline") return "idle-offline";
  return tokenValue.trim() ? "link-pasted" : "link-empty";
}

/** In-page HUD: unpaired shows the token field; paired shows Capture Page. */
export function ToolbarApp({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose?: () => void;
}) {
  const [probeResult, setProbeResult] = useState<ProbeResult | null>(null);
  const [tokenValue, setTokenValue] = useState("");
  const [tokenBusy, setTokenBusy] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [verifyingSession, setVerifyingSession] = useState(false);
  const [mounted, setMounted] = useState(visible);
  const [open, setOpen] = useState(false);
  const actionErrorTimer = useRef<number | null>(null);
  const siteName = siteNameFromLocation();

  const clearActionErrorSoon = useCallback(() => {
    if (actionErrorTimer.current !== null) {
      window.clearTimeout(actionErrorTimer.current);
    }
    actionErrorTimer.current = window.setTimeout(() => {
      setActionError(null);
      actionErrorTimer.current = null;
    }, ACTION_ERROR_MS);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const settings = await withTimeout(loadSettings(), 400, DEFAULT_SETTINGS);
      if (!settings.apiKey) {
        setProbeResult({ state: "unpaired" });
        setVerifyingSession(false);
        return;
      }

      setVerifyingSession(true);
      setActionError(null);
      try {
        const result = await sendMessage("probe", settings);
        setProbeResult(result);
        if (result.state === "connected") {
          setTokenError(null);
          setTokenValue("");
        } else if (result.state === "unpaired") {
          setTokenError(COPY.expired);
          await saveSettings({ ...settings, apiKey: "" });
        } else if (result.state === "offline") {
          setTokenError(null);
        }
      } finally {
        setVerifyingSession(false);
      }
    } catch (err) {
      console.warn("[pond] toolbar probe failed", err);
      setProbeResult({ state: "offline" });
      setVerifyingSession(false);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      let cancelled = false;
      const frame = window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          if (!cancelled) setOpen(true);
        });
      });
      return () => {
        cancelled = true;
        window.cancelAnimationFrame(frame);
      };
    }

    setOpen(false);
    const timer = window.setTimeout(() => setMounted(false), SHELL_ENTER_MS);
    return () => window.clearTimeout(timer);
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    void refresh();
  }, [visible, refresh]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose?.();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!tokenError) return;
    const timer = window.setTimeout(() => setTokenError(null), TOKEN_ERROR_MS);
    return () => window.clearTimeout(timer);
  }, [tokenError]);

  useEffect(() => {
    return () => {
      if (actionErrorTimer.current !== null) {
        window.clearTimeout(actionErrorTimer.current);
      }
    };
  }, []);

  async function applyToken(): Promise<void> {
    setTokenError(null);
    setActionError(null);
    const current = await loadSettings();
    const parsed = parsePairingInput(tokenValue, current.port);
    if (!parsed) {
      setTokenError(COPY.invalid);
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
      const result = await sendMessage("probe", next);
      setProbeResult(result);
      if (result.state === "offline") {
        setTokenError(COPY.offline);
      } else if (result.state === "unpaired") {
        setTokenError(COPY.rejected);
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
    setActionError(null);
    try {
      const ok = await sendMessage("capture", { url, trigger: "toolbar" });
      if (!ok) {
        setActionError(COPY.capture);
        clearActionErrorSoon();
      }
    } catch (err) {
      console.warn("[pond] capture failed", err);
      setActionError(COPY.capture);
      clearActionErrorSoon();
    }
  }

  if (!mounted) return null;

  const mode = modeFromState(
    probeResult,
    tokenValue,
    tokenBusy,
    tokenError,
    verifyingSession,
    actionError,
  );

  const errorMessage =
    tokenError ??
    actionError ??
    (mode === "idle-offline" ? COPY.offline : undefined);

  return (
    <div className="pond-toolbar-shell" data-open={open || undefined}>
      <button
        type="button"
        className="pond-toolbar-backdrop"
        aria-label="Dismiss"
        tabIndex={-1}
        onClick={() => onClose?.()}
      />
      <div className="pond-toolbar-root">
        <Toolbar
          mode={mode}
          siteName={siteName}
          tokenValue={tokenValue}
          errorMessage={errorMessage}
          onCapturePage={() => void capturePage()}
          onRetry={() => void refresh()}
          onTokenChange={(value) => {
            setTokenValue(value);
            setTokenError(null);
          }}
          onTokenSubmit={() => void applyToken()}
        />
      </div>
    </div>
  );
}
