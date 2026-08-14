import { Button, Logo } from "@pond/ui";
import { BorderBeam } from "border-beam";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import styles from "./styles.module.css";

export type ToolbarMode =
  | "idle-connected"
  | "idle-offline"
  | "link-empty"
  | "link-pasted"
  | "link-loading"
  | "link-error"
  | "action-error";

export interface ToolbarProps {
  mode: ToolbarMode;
  /** Hostname shown while connecting, e.g. `x.com`. */
  siteName?: string;
  tokenValue?: string;
  errorMessage?: string;
  onCapturePage?: () => void;
  onTokenChange?: (value: string) => void;
  onTokenSubmit?: () => void;
  onRetry?: () => void;
}

type SwapPhase = "idle" | "exit" | "enter-start";

/** Matches `--text-swap-dur` in styles.module.css. */
const TEXT_SWAP_MS = 150;

function slotFor(mode: ToolbarMode): string {
  if (mode === "link-empty" || mode === "link-pasted") return "link-field";
  if (
    mode === "link-error" ||
    mode === "action-error" ||
    mode === "idle-offline"
  ) {
    return "error";
  }
  return mode;
}

function connectingCopy(siteName?: string): string {
  const site = siteName?.trim();
  return site ? `Connecting ${site} to Pond...` : "Connecting to Pond...";
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

/** Floating in-page Pond toolbar matching the extension HUD design. */
export function Toolbar({
  mode,
  siteName,
  tokenValue = "",
  errorMessage = "Something went wrong",
  onCapturePage,
  onTokenChange,
  onTokenSubmit,
  onRetry,
}: ToolbarProps) {
  const [shown, setShown] = useState({
    mode,
    siteName,
    tokenValue,
    errorMessage,
  });
  const [phase, setPhase] = useState<SwapPhase>("idle");
  const [shaking, setShaking] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const swapTimer = useRef<number | null>(null);
  const shakeTimer = useRef<number | null>(null);
  const prevError = useRef(false);

  const targetSlot = slotFor(mode);
  const shownSlot = slotFor(shown.mode);
  const error =
    shown.mode === "link-error" ||
    shown.mode === "action-error" ||
    shown.mode === "idle-offline";
  const loading = shown.mode === "link-loading";

  useEffect(() => {
    const sameSlot = targetSlot === shownSlot;
    const samePayload =
      mode === shown.mode &&
      siteName === shown.siteName &&
      tokenValue === shown.tokenValue &&
      errorMessage === shown.errorMessage;

    if (samePayload) return;

    if (sameSlot) {
      setShown({ mode, siteName, tokenValue, errorMessage });
      return;
    }

    if (swapTimer.current !== null) window.clearTimeout(swapTimer.current);
    setPhase("exit");
    swapTimer.current = window.setTimeout(() => {
      setShown({ mode, siteName, tokenValue, errorMessage });
      setPhase("enter-start");
    }, TEXT_SWAP_MS);

    return () => {
      if (swapTimer.current !== null) window.clearTimeout(swapTimer.current);
    };
  }, [
    mode,
    siteName,
    tokenValue,
    errorMessage,
    targetSlot,
    shownSlot,
    shown.mode,
    shown.siteName,
    shown.tokenValue,
    shown.errorMessage,
  ]);

  useLayoutEffect(() => {
    if (phase !== "enter-start") return;
    void bodyRef.current?.offsetHeight;
    setPhase("idle");
  }, [phase]);

  useEffect(() => {
    const nextError =
      mode === "link-error" ||
      mode === "action-error" ||
      mode === "idle-offline";
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
                aria-label="Try again"
                onClick={onRetry}
              >
                Try again
              </Button>
            </div>
          ) : null}

          {shown.mode === "link-empty" || shown.mode === "link-pasted" ? (
            <div className={styles.field}>
              <input
                className={styles.input}
                type="text"
                placeholder="Pairing Token..."
                value={shown.tokenValue}
                autoComplete="off"
                spellCheck={false}
                aria-label="Pairing token"
                onChange={(e) => onTokenChange?.(e.currentTarget.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && shown.tokenValue.trim()) {
                    onTokenSubmit?.();
                  }
                }}
              />
              {shown.mode === "link-pasted" ? (
                <span className={styles.fade} aria-hidden />
              ) : null}
            </div>
          ) : null}

          {shown.mode === "link-loading" ? (
            <p className={styles.status}>{connectingCopy(shown.siteName)}</p>
          ) : null}

          {shown.mode === "link-error" || shown.mode === "action-error" ? (
            <p className={styles.error}>{shown.errorMessage}</p>
          ) : null}
        </div>
      </div>
    </BorderBeam>
  );
}
