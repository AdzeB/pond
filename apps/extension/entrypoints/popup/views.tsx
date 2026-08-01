import type { Source } from "@pond/schema/db";
import { sourceLabel } from "@/utils/url";
import styles from "./popup.module.css";

export function LoadingScreen() {
  return <div className={styles.loading}>Connecting…</div>;
}

interface TokenScreenProps {
  value: string;
  onChange: (value: string) => void;
  onContinue: () => void | Promise<void>;
  busy: boolean;
  error: string | null;
  inputId?: string;
}

export function TokenScreen({
  value,
  onChange,
  onContinue,
  busy,
  error,
  inputId = "pairing-token",
}: TokenScreenProps) {
  return (
    <div className={styles.screen}>
      <h1 className={styles.title}>Setup Pairing Token For Pond</h1>
      <input
        id={inputId}
        className={styles.field}
        type="text"
        placeholder="Pairing Token…"
        value={value}
        disabled={busy}
        autoComplete="off"
        spellCheck={false}
        onChange={(e) => onChange(e.currentTarget.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !busy && value.trim()) void onContinue();
        }}
      />
      <button
        type="button"
        className={styles.primary}
        disabled={busy || !value.trim()}
        onClick={() => void onContinue()}
      >
        {busy ? "Connecting…" : "Continue"}
      </button>
      {error ? <p className={styles.error}>{error}</p> : null}
      <p className={styles.helper}>
        In Pond, open the menu bar and choose{" "}
        <strong>Copy Pairing Token</strong>, then paste it here.
      </p>
    </div>
  );
}

function allowCopy(source: Source): string {
  switch (source) {
    case "twitter":
      return "Automatically save tweets you like and bookmark";
    case "instagram":
      return "Automatically save posts you save";
    case "youtube":
      return "Automatically save videos you like";
    case "reddit":
      return "Automatically save posts you upvote and save";
    case "tiktok":
      return "Automatically save videos you favorite";
    case "pinterest":
      return "Automatically save pins you save";
    case "threads":
      return "Automatically save posts you like";
    default:
      return "Automatically save items you save on this site";
  }
}

interface ConnectScreenProps {
  source: Source;
  busy: boolean;
  error: string | null;
  onConnect: () => void | Promise<void>;
  onCancel: () => void;
}

export function ConnectScreen({
  source,
  busy,
  error,
  onConnect,
  onCancel,
}: ConnectScreenProps) {
  const label = sourceLabel(source);
  return (
    <div className={styles.screen}>
      <h1 className={styles.title}>
        <span className={styles["source-line"]}>Connect Pond With {label}</span>
      </h1>

      <div className={styles.card}>
        <p className={styles["section-label"]}>Allow Pond to:</p>
        <ul className={styles.list}>
          <li>
            <span className={`${styles.mark} ${styles["mark-ok"]}`}>✓</span>
            <span>{allowCopy(source)}</span>
          </li>
          <li>
            <span className={`${styles.mark} ${styles["mark-ok"]}`}>✓</span>
            <span>Store your auth cookies</span>
          </li>
        </ul>

        <p className={styles["section-label"]}>Pond will not:</p>
        <ul className={styles.list}>
          <li>
            <span className={`${styles.mark} ${styles["mark-no"]}`}>✕</span>
            <span>Automate any actions within your profile</span>
          </li>
          <li>
            <span className={`${styles.mark} ${styles["mark-no"]}`}>✕</span>
            <span>Share any authentication</span>
          </li>
        </ul>
      </div>

      {error ? <p className={styles.error}>{error}</p> : null}

      <div className={styles.row}>
        <button type="button" className={styles.secondary} onClick={onCancel}>
          Cancel
        </button>
        <button
          type="button"
          className={styles.primary}
          disabled={busy}
          onClick={() => void onConnect()}
        >
          {busy ? "Connecting…" : "Connect"}
        </button>
      </div>
    </div>
  );
}

interface IdleScreenProps {
  libraryName: string;
  offline?: boolean;
  onRetry?: () => void | Promise<void>;
}

export function IdleScreen({ libraryName, offline, onRetry }: IdleScreenProps) {
  return (
    <div className={styles.screen}>
      <div className={styles["idle-stat"]}>
        <strong>{libraryName}</strong>
        {offline ? (
          <span className={styles["tone-warn"]}>Pond is offline</span>
        ) : (
          <span className={styles["tone-ok"]}>Capturing in the background</span>
        )}
      </div>
      {offline && onRetry ? (
        <button
          type="button"
          className={styles.primary}
          onClick={() => void onRetry()}
        >
          Try again
        </button>
      ) : null}
      <p className={styles.helper}>
        Open a source site to connect your session and sync saves.
      </p>
    </div>
  );
}
