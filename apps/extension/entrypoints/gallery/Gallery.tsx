import type { ReactNode } from "react";
import {
  ConnectScreen,
  IdleScreen,
  LoadingScreen,
  TokenScreen,
} from "../popup/views";
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

export function Gallery() {
  return (
    <main className={styles.gallery}>
      <header className={styles.header}>
        <h1>Popup states</h1>
        <p>
          Toolbar popup UI. Edit <code>entrypoints/popup/views.tsx</code>.
        </p>
      </header>

      <div className={styles.grid}>
        <Frame label="loading">
          <LoadingScreen />
        </Frame>

        <Frame label="token" note="empty">
          <TokenScreen
            value=""
            onChange={noop}
            onContinue={noop}
            busy={false}
            error={null}
          />
        </Frame>

        <Frame label="token" note="error">
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
