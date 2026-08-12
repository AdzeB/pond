import {
  IconChevronLeftOutline18,
  IconChevronRightOutline18,
} from "@pond/icons/outline/18";
import { Button } from "@pond/ui";
import { useEffect, useState } from "react";
import { Toolbar, type ToolbarMode } from "../toolbar/Toolbar";
import styles from "./gallery.module.css";

const SAMPLE_TOKEN =
  "pond://pair?port=41610&token=321c302c7b047638d8d60abf8ac14d332fdca3224727426d";

interface Step {
  mode: ToolbarMode;
  label: string;
  siteName?: string;
  token?: string;
  error?: string;
  holdMs: number;
}

/** Happy path, then a bad-token recovery loop for gallery preview. */
const FLOW: Step[] = [
  { mode: "link-empty", label: "Link · empty", holdMs: 1600 },
  {
    mode: "link-pasted",
    label: "Link · pasted",
    token: SAMPLE_TOKEN,
    holdMs: 1800,
  },
  {
    mode: "link-loading",
    label: "Link · loading",
    siteName: "x.com",
    holdMs: 2000,
  },
  { mode: "idle-connected", label: "Idle · connected", holdMs: 2200 },
  { mode: "link-empty", label: "Link · empty", holdMs: 1200 },
  {
    mode: "link-pasted",
    label: "Link · bad token",
    token: "not-a-pairing-token",
    holdMs: 1400,
  },
  {
    mode: "link-error",
    label: "Link · error",
    error: "This isn't a pairing token",
    holdMs: 2200,
  },
];

/** Auto-playing state machine that cycles the toolbar through its HUD modes. */
export function ToolbarStateMachine() {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const step = FLOW[index] ?? FLOW[0];

  useEffect(() => {
    if (!playing) return;
    const holdMs = FLOW[index]?.holdMs ?? 1600;
    const id = window.setTimeout(() => {
      setIndex((current) => (current + 1) % FLOW.length);
    }, holdMs);
    return () => window.clearTimeout(id);
  }, [playing, index]);

  return (
    <section className={styles.player}>
      <div className={styles.playerHeader}>
        <strong>State machine</strong>
        <span>{step.label}</span>
      </div>

      <div className={styles.playerStage}>
        <Toolbar
          mode={step.mode}
          siteName={step.siteName}
          tokenValue={step.token ?? ""}
          errorMessage={step.error}
        />
      </div>

      <div className={styles.playerControls}>
        <Button
          variant="ghost"
          size="sm"
          icon
          aria-label="Previous state"
          onClick={() => {
            setPlaying(false);
            setIndex((current) => (current - 1 + FLOW.length) % FLOW.length);
          }}
        >
          <IconChevronLeftOutline18 />
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setPlaying((value) => !value)}
        >
          {playing ? "Pause" : "Play"}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          icon
          aria-label="Next state"
          onClick={() => {
            setPlaying(false);
            setIndex((current) => (current + 1) % FLOW.length);
          }}
        >
          <IconChevronRightOutline18 />
        </Button>
      </div>
    </section>
  );
}
