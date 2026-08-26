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

function Bar({ mode, error }: { mode: ToolbarMode; error?: string }) {
  return (
    <Toolbar
      mode={mode}
      errorMessage={error}
      onCapturePage={() => undefined}
      onRetry={() => undefined}
    />
  );
}

type SoloState = ToolbarMode;

function SoloScreen({ state }: { state: SoloState }) {
  switch (state) {
    case "idle-connected":
      return <Bar mode="idle-connected" />;
    case "checking":
      return <Bar mode="checking" />;
    case "idle-offline":
      return (
        <Bar
          mode="idle-offline"
          error="Pond isn't running. Open the app and try again."
        />
      );
    case "action-busy":
      return <Bar mode="action-busy" />;
    case "action-done":
      return <Bar mode="action-done" />;
    case "action-error":
      return (
        <Bar
          mode="action-error"
          error="Couldn't capture this page. Try again."
        />
      );
  }
}

function parseSolo(value: string | null): SoloState | null {
  switch (value) {
    case "idle-connected":
    case "checking":
    case "idle-offline":
    case "action-busy":
    case "action-done":
    case "action-error":
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
        <Frame label="Idle" note="checking">
          <Bar mode="checking" />
        </Frame>
        <Frame label="Idle" note="offline">
          <Bar
            mode="idle-offline"
            error="Pond isn't running. Open the app and try again."
          />
        </Frame>
        <Frame label="Action" note="capturing">
          <Bar mode="action-busy" />
        </Frame>
        <Frame label="Action" note="captured">
          <Bar mode="action-done" />
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
