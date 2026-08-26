import { useCallback, useEffect, useRef, useState } from "react";
import { sendMessage } from "@/utils/messaging";
import type { ProbeResult } from "@/utils/probe";
import { Toolbar, type ToolbarMode } from "./Toolbar";

const SHELL_ENTER_MS = 250;

const MIN_CAPTURE_MS = 900;

const ACTION_ERROR_MS = 3200;

const ACTION_DONE_MS = 2200;

const COPY = {
  offline: "Pond isn't running. Open the app and try again.",
  capture: "Couldn't capture this page. Try again.",
} as const;

async function waitAtLeast(startedAt: number, minMs: number): Promise<void> {
  const remaining = minMs - (Date.now() - startedAt);
  if (remaining <= 0) return;
  await new Promise<void>((resolve) => {
    window.setTimeout(resolve, remaining);
  });
}

function modeFromState(
  probeResult: ProbeResult | null,
  checking: boolean,
  actionBusy: boolean,
  actionDone: boolean,
  actionError: string | null,
): ToolbarMode {
  if (checking && !probeResult) return "checking";
  if (actionBusy) return "action-busy";
  if (actionDone) return "action-done";
  if (actionError) return "action-error";
  if (probeResult?.state === "connected") return "idle-connected";
  return "idle-offline";
}

export function ToolbarApp({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose?: () => void;
}) {
  const [probeResult, setProbeResult] = useState<ProbeResult | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionDone, setActionDone] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [mounted, setMounted] = useState(visible);
  const [open, setOpen] = useState(false);
  const actionErrorTimer = useRef<number | null>(null);
  const actionDoneTimer = useRef<number | null>(null);

  const clearActionErrorSoon = useCallback(() => {
    if (actionErrorTimer.current !== null) {
      window.clearTimeout(actionErrorTimer.current);
    }
    actionErrorTimer.current = window.setTimeout(() => {
      setActionError(null);
      actionErrorTimer.current = null;
    }, ACTION_ERROR_MS);
  }, []);

  const clearActionDoneSoon = useCallback(() => {
    if (actionDoneTimer.current !== null) {
      window.clearTimeout(actionDoneTimer.current);
    }
    actionDoneTimer.current = window.setTimeout(() => {
      setActionDone(false);
      actionDoneTimer.current = null;
    }, ACTION_DONE_MS);
  }, []);

  const refresh = useCallback(async () => {
    try {
      setChecking(true);
      setActionError(null);
      try {
        const result = await sendMessage("probe");
        setProbeResult(result);
      } finally {
        setChecking(false);
      }
    } catch (err) {
      console.warn("[pond] toolbar probe failed", err);
      setProbeResult({ state: "offline" });
      setChecking(false);
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
    return () => {
      if (actionErrorTimer.current !== null) {
        window.clearTimeout(actionErrorTimer.current);
      }
      if (actionDoneTimer.current !== null) {
        window.clearTimeout(actionDoneTimer.current);
      }
    };
  }, []);

  async function capturePage(): Promise<void> {
    if (actionBusy) return;
    const url = window.location.href;
    if (actionErrorTimer.current !== null) {
      window.clearTimeout(actionErrorTimer.current);
      actionErrorTimer.current = null;
    }
    if (actionDoneTimer.current !== null) {
      window.clearTimeout(actionDoneTimer.current);
      actionDoneTimer.current = null;
    }
    setActionError(null);
    setActionDone(false);
    setActionBusy(true);
    const startedAt = Date.now();
    try {
      const ok = await sendMessage("capture", { url, trigger: "toolbar" });
      await waitAtLeast(startedAt, MIN_CAPTURE_MS);
      if (!ok) {
        setActionError(COPY.capture);
        clearActionErrorSoon();
        return;
      }
      setActionDone(true);
      clearActionDoneSoon();
    } catch (err) {
      console.warn("[pond] capture failed", err);
      await waitAtLeast(startedAt, MIN_CAPTURE_MS);
      setActionError(COPY.capture);
      clearActionErrorSoon();
    } finally {
      setActionBusy(false);
    }
  }

  if (!mounted) return null;

  const mode = modeFromState(
    probeResult,
    checking,
    actionBusy,
    actionDone,
    actionError,
  );

  const errorMessage =
    actionError ?? (mode === "idle-offline" ? COPY.offline : undefined);

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
          errorMessage={errorMessage}
          onCapturePage={() => void capturePage()}
          onRetry={() => void refresh()}
        />
      </div>
    </div>
  );
}
