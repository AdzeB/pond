import { Button } from "@pond/ui/button";
import { Logo } from "@pond/ui/logo";
import { BorderBeam } from "border-beam";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import styles from "./styles.module.css";

export type ToolbarMode =
  | "checking"
  | "idle-connected"
  | "idle-offline"
  | "action-busy"
  | "action-done"
  | "action-error";

export interface ToolbarProps {
  mode: ToolbarMode;
  errorMessage?: string;
  onCapturePage?: () => void;
  onRetry?: () => void;
}

type SwapPhase = "idle" | "exit" | "enter-start";

const TEXT_SWAP_MS = 150;

function slotFor(mode: ToolbarMode): string {
  if (mode === "idle-offline" || mode === "action-error") return "error";
  if (mode === "checking" || mode === "action-busy") return "busy";
  return mode;
}

function Divider() {
  return <span className={styles.divider} aria-hidden />;
}

function Spinner() {
  return (
    <svg
      className={styles.spinnerGlyph}
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      aria-hidden
    >
      <title>Loading</title>
      <circle
        cx="9"
        cy="9"
        r="7"
        stroke="currentColor"
        strokeOpacity="0.15"
        strokeWidth="2.5"
      />
      <path
        d="M16 9C16 5.13401 12.866 2 9 2"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Toolbar({
  mode,
  errorMessage = "Couldn't finish that",
  onCapturePage,
  onRetry,
}: ToolbarProps) {
  const [shown, setShown] = useState({ mode, errorMessage });
  const [phase, setPhase] = useState<SwapPhase>("idle");
  const [shaking, setShaking] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const swapTimer = useRef<number | null>(null);
  const shakeTimer = useRef<number | null>(null);
  const prevError = useRef(false);

  const targetSlot = slotFor(mode);
  const shownSlot = slotFor(shown.mode);
  const error = shown.mode === "action-error" || shown.mode === "idle-offline";
  const loading = shown.mode === "checking" || shown.mode === "action-busy";

  useEffect(() => {
    const sameSlot = targetSlot === shownSlot;
    const samePayload =
      mode === shown.mode && errorMessage === shown.errorMessage;

    if (samePayload) return;

    if (sameSlot) {
      setShown({ mode, errorMessage });
      return;
    }

    if (swapTimer.current !== null) window.clearTimeout(swapTimer.current);
    setPhase("exit");
    swapTimer.current = window.setTimeout(() => {
      setShown({ mode, errorMessage });
      setPhase("enter-start");
    }, TEXT_SWAP_MS);

    return () => {
      if (swapTimer.current !== null) window.clearTimeout(swapTimer.current);
    };
  }, [
    mode,
    errorMessage,
    targetSlot,
    shownSlot,
    shown.mode,
    shown.errorMessage,
  ]);

  useLayoutEffect(() => {
    if (phase !== "enter-start") return;
    void bodyRef.current?.offsetHeight;
    setPhase("idle");
  }, [phase]);

  useEffect(() => {
    const nextError = mode === "action-error" || mode === "idle-offline";
    if (nextError && !prevError.current) {
      setShaking(true);
      if (shakeTimer.current !== null) window.clearTimeout(shakeTimer.current);
      shakeTimer.current = window.setTimeout(() => setShaking(false), 300);
    }
    prevError.current = nextError;
    return () => {
      if (shakeTimer.current !== null) window.clearTimeout(shakeTimer.current);
    };
  }, [mode]);

  const bodyClass =
    phase === "exit"
      ? `${styles.body} ${styles.bodyExit}`
      : phase === "enter-start"
        ? `${styles.body} ${styles.bodyEnterStart}`
        : styles.body;

  return (
    <BorderBeam
      className={styles.beam}
      size="sm"
      theme="light"
      colorVariant="colorful"
      strength={1}
      brightness={1.6}
      saturation={1.3}
      active={loading}
      borderRadius={8}
    >
      <div
        className={styles.bar}
        data-mode={shown.mode}
        data-error={error || undefined}
        data-shaking={shaking || undefined}
        role="toolbar"
        aria-label="Pond"
      >
        <Button variant="ghost" size="sm" icon className={styles.logo}>
          <span
            className={styles.markSwap}
            data-state={loading ? "spinner" : "logo"}
          >
            <span className={styles.markIcon} data-icon="logo">
              <Logo size={18} />
            </span>
            <span className={styles.markIcon} data-icon="spinner">
              <Spinner />
            </span>
          </span>
        </Button>

        <Divider />

        <div ref={bodyRef} className={bodyClass}>
          {shown.mode === "idle-connected" ? (
            <Button
              variant="ghost"
              size="sm"
              aria-label="Capture Page"
              onClick={onCapturePage}
            >
              Capture Page
            </Button>
          ) : null}

          {shown.mode === "idle-offline" ? (
            <div className={styles.errorRow}>
              <p className={styles.error}>{shown.errorMessage}</p>
              <Button
                variant="ghost"
                size="sm"
                aria-label="Try Again"
                onClick={onRetry}
              >
                Try Again
              </Button>
            </div>
          ) : null}

          {shown.mode === "checking" ? (
            <p className={styles.status}>Looking for Pond</p>
          ) : null}

          {shown.mode === "action-busy" ? (
            <p className={styles.status}>Capturing page</p>
          ) : null}

          {shown.mode === "action-done" ? (
            <p className={styles.status}>Page captured</p>
          ) : null}

          {shown.mode === "action-error" ? (
            <p className={styles.error}>{shown.errorMessage}</p>
          ) : null}
        </div>
      </div>
    </BorderBeam>
  );
}
