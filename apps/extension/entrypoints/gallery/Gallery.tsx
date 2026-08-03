import type { ReactNode } from "react";
import { PopupView } from "../app/views";
import styles from "./gallery.module.css";

interface FrameProps {
  label: string;
  note?: string;
  children: ReactNode;
}

function Frame({ label, note, children }: FrameProps) {
  return (
    <figure className={styles.frame}>
      <figcaption>
        <strong>{label}</strong>
        {note ? <span>{note}</span> : null}
      </figcaption>
      <div className={styles.stage}>{children}</div>
    </figure>
  );
}

const noop = (): void => undefined;

type SoloState = "loading" | "link" | "link-error" | "idle" | "idle-offline";

function SoloScreen({ state }: { state: SoloState }) {
  switch (state) {
    case "loading":
      return <PopupView state="loading" />;
    case "link":
      return (
        <PopupView
          state="unpaired"
          value=""
          onChange={noop}
          onContinue={noop}
          busy={false}
          error={null}
        />
      );
    case "link-error":
      return (
        <PopupView
          state="unpaired"
          inputId="token-error"
          value="not-a-token"
          onChange={noop}
          onContinue={noop}
          busy={false}
          error="That doesn't look like a Pond pairing token."
        />
      );
    case "idle":
      return <PopupView state="connected" libraryName="My Pond" />;
    case "idle-offline":
      return <PopupView state="offline" onRetry={noop} />;
  }
}

function parseSolo(value: string | null): SoloState | null {
  switch (value) {
    case "loading":
    case "link":
    case "link-error":
    case "idle":
    case "idle-offline":
      return value;
    default:
      return null;
  }
}

export function Gallery() {
  const solo = parseSolo(
    new URLSearchParams(window.location.search).get("solo"),
  );

  if (solo) {
    return (
      <div className={styles.solo} data-state={solo}>
        <SoloScreen state={solo} />
      </div>
    );
  }

  return (
    <main className={styles.gallery}>
      <header className={styles.header}>
        <h1>Extension popup</h1>
        <p>
          Toolbar popup states. Edit <code>entrypoints/app/views/</code>.
        </p>
      </header>

      <div className={styles.grid}>
        <Frame label="loading">
          <PopupView state="loading" />
        </Frame>

        <Frame label="link" note="empty">
          <PopupView
            state="unpaired"
            value=""
            onChange={noop}
            onContinue={noop}
            busy={false}
            error={null}
          />
        </Frame>

        <Frame label="link" note="error">
          <PopupView
            state="unpaired"
            inputId="token-error"
            value="not-a-token"
            onChange={noop}
            onContinue={noop}
            busy={false}
            error="That doesn't look like a Pond pairing token."
          />
        </Frame>

        <Frame label="idle" note="linked">
          <PopupView state="connected" libraryName="My Pond" />
        </Frame>

        <Frame label="idle" note="offline">
          <PopupView state="offline" onRetry={noop} />
        </Frame>
      </div>
    </main>
  );
}
