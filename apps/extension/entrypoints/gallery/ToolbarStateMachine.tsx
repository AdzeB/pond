import {
  IconChevronLeftOutline18,
  IconChevronRightOutline18,
} from "@pond/icons/outline/18";
import { Button } from "@pond/ui";
import { useEffect, useState } from "react";
import { Toolbar, type ToolbarMode } from "../toolbar/Toolbar";
import styles from "./styles.module.css";

interface Step {
  mode: ToolbarMode;
  label: string;
  error?: string;
  holdMs: number;
}

const FLOW: Step[] = [
  { mode: "checking", label: "Idle · checking", holdMs: 1600 },
  { mode: "idle-connected", label: "Idle · connected", holdMs: 2200 },
  { mode: "action-busy", label: "Action · capturing", holdMs: 1800 },
  { mode: "action-done", label: "Action · captured", holdMs: 1800 },
  {
    mode: "idle-offline",
    label: "Idle · offline",
    error: "Pond isn't running. Open the app and try again.",
    holdMs: 2200,
  },
  { mode: "idle-connected", label: "Idle · connected", holdMs: 1600 },
  {
    mode: "action-error",
    label: "Action · error",
    error: "Couldn't capture this page. Try again.",
    holdMs: 2000,
  },
];

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
        <Toolbar mode={step.mode} errorMessage={step.error} />
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
