import type { ReactNode } from "react";
import {
  ConnectScreen,
  IdleScreen,
  LoadingScreen,
  TokenScreen,
} from "../app/views";
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

type SoloState =
  | "loading"
  | "link"
  | "link-error"
  | "connect-x"
  | "connect-ig"
  | "idle"
  | "idle-offline";

function SoloScreen({ state }: { state: SoloState }) {
  switch (state) {
    case "loading":
      return <LoadingScreen />;
    case "link":
      return (
        <TokenScreen
          value=""
          onChange={noop}
          onContinue={noop}
          busy={false}
          error={null}
        />
      );
    case "link-error":
      return (
        <TokenScreen
          inputId="token-error"
          value="not-a-token"
          onChange={noop}
          onContinue={noop}
          busy={false}
          error="That doesn't look like a Pond pairing token."
        />
      );
    case "connect-x":
      return (
        <ConnectScreen
          source="twitter"
          busy={false}
          error={null}
          onConnect={noop}
          onCancel={noop}
        />
      );
    case "connect-ig":
      return (
        <ConnectScreen
          source="instagram"
          busy={false}
          error={null}
          onConnect={noop}
          onCancel={noop}
        />
      );
    case "idle":
      return <IdleScreen libraryName="My Pond" />;
    case "idle-offline":
      return <IdleScreen libraryName="Pond" offline onRetry={noop} />;
  }
}

function parseSolo(value: string | null): SoloState | null {
  switch (value) {
    case "loading":
    case "link":
    case "link-error":
    case "connect-x":
    case "connect-ig":
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
        <h1>Extension pages</h1>
        <p>
          Full-page UI opened from the toolbar. Edit{" "}
          <code>entrypoints/app/views.tsx</code>.
        </p>
      </header>

      <div className={styles.grid}>
        <Frame label="loading">
          <LoadingScreen />
        </Frame>

        <Frame label="link" note="empty">
          <TokenScreen
            value=""
            onChange={noop}
            onContinue={noop}
            busy={false}
            error={null}
          />
        </Frame>

        <Frame label="link" note="error">
          <TokenScreen
            inputId="token-error"
            value="not-a-token"
            onChange={noop}
            onContinue={noop}
            busy={false}
            error="That doesn't look like a Pond pairing token."
          />
        </Frame>

        <Frame label="connect" note="X">
          <ConnectScreen
            source="twitter"
            busy={false}
            error={null}
            onConnect={noop}
            onCancel={noop}
          />
        </Frame>

        <Frame label="connect" note="Instagram">
          <ConnectScreen
            source="instagram"
            busy={false}
            error={null}
            onConnect={noop}
            onCancel={noop}
          />
        </Frame>

        <Frame label="idle" note="linked">
          <IdleScreen libraryName="My Pond" />
        </Frame>

        <Frame label="idle" note="offline">
          <IdleScreen libraryName="Pond" offline onRetry={noop} />
        </Frame>
      </div>
    </main>
  );
}
