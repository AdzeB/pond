import type { ReactNode } from "react";
import { Toolbar, type ToolbarMode } from "../toolbar/Toolbar";
import styles from "./styles.module.css";
import { ToolbarStateMachine } from "./ToolbarStateMachine";

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

function Bar({
  mode,
  token = "",
  error,
  siteName,
}: {
  mode: ToolbarMode;
  token?: string;
  error?: string;
  siteName?: string;
}) {
  return (
    <Toolbar
      mode={mode}
      siteName={siteName}
      tokenValue={token}
      errorMessage={error}
      onCapturePage={() => undefined}
      onTokenChange={() => undefined}
      onTokenSubmit={() => undefined}
      onRetry={() => undefined}
    />
  );
}

type SoloState =
  | "idle-connected"
  | "link-empty"
  | "link-pasted"
  | "link-loading"
  | "link-error";

function SoloScreen({ state }: { state: SoloState }) {
  switch (state) {
    case "idle-connected":
      return <Bar mode="idle-connected" />;
    case "link-empty":
      return <Bar mode="link-empty" />;
    case "link-pasted":
      return (
        <Bar
          mode="link-pasted"
          token="pond://pair?port=41610&token=321c302c7b047638d8d60abf8ac14d332fdca3224727426d"
        />
      );
    case "link-loading":
      return <Bar mode="link-loading" siteName="x.com" />;
    case "link-error":
      return <Bar mode="link-error" error="This isn't a pairing token" />;
  }
}

function parseSolo(value: string | null): SoloState | null {
  switch (value) {
    case "idle-connected":
    case "link-empty":
    case "link-pasted":
    case "link-loading":
    case "link-error":
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
        <h1>Extension toolbar</h1>
        <p>
          In-page HUD states. Edit <code>entrypoints/toolbar/</code>.
        </p>
      </header>

      <ToolbarStateMachine />

      <div className={styles.grid}>
        <Frame label="Idle" note="connected">
          <Bar mode="idle-connected" />
        </Frame>
        <Frame label="Idle" note="offline">
          <Bar
            mode="idle-offline"
            error="Pond isn't running. Open the app and try again."
          />
        </Frame>
        <Frame label="Link" note="empty">
          <Bar mode="link-empty" />
        </Frame>
        <Frame label="Link" note="pasted">
          <Bar
            mode="link-pasted"
            token="pond://pair?port=41610&token=321c302c7b047638d8d60abf8ac14d332fdca3224727426d"
          />
        </Frame>
        <Frame label="Link" note="loading">
          <Bar mode="link-loading" siteName="x.com" />
        </Frame>
        <Frame label="Link" note="error">
          <Bar mode="link-error" error="This isn't a pairing token" />
        </Frame>
        <Frame label="Action" note="error">
          <Bar
            mode="action-error"
            error="Couldn't capture this page. Try again."
          />
        </Frame>
      </div>
    </main>
  );
}
