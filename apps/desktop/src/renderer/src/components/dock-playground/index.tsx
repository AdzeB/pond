import { IconXmarkOutline12 } from "@pond/icons/outline/12";
import { EMPTY_QUERY } from "@pond/schema/filters/types";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LibraryTray } from "@/components/library-dock";
import type { DockPreview } from "@/components/library-dock/lib/types";
import { motionScale } from "@/lib/ui/motion";
import {
  clearAsk,
  setAskError,
  setAskResult,
  setAskSummary,
  startTurn,
  useAskResult,
} from "@/stores/ask-store";
import { dockMode, useDockMode } from "@/stores/dock-mode";
import { selection, useSelectionSize } from "@/stores/selection";
import styles from "./styles.module.css";

/** Left panel drives the live, globally-mounted Tray.Library (real transitions); the grid renders one forced preview per dock state so all of them can be styled at once. */

const ASK_QUESTION = "mountain landscapes at golden hour";

const makeIds = (count: number): string[] =>
  Array.from({ length: count }, (_, i) => `preview-${i}`);

function seedAskResults(): void {
  clearAsk();
  const nonce = startTurn({ question: ASK_QUESTION });
  setAskResult(nonce, ASK_QUESTION, makeIds(24), EMPTY_QUERY);
  setAskSummary(
    nonce,
    "Mostly wide alpine ranges and sunset ridgelines you saved this spring.",
  );
}

function seedAskEmpty(): void {
  clearAsk();
  const nonce = startTurn({ question: ASK_QUESTION });
  setAskResult(nonce, ASK_QUESTION, [], EMPTY_QUERY, [
    { id: "any-time", label: "Any time", query: EMPTY_QUERY, count: 42 },
    { id: "drop-tag", label: "Without #travel", query: EMPTY_QUERY, count: 18 },
  ]);
}

function seedAskThinking(): void {
  clearAsk();
  startTurn({ question: ASK_QUESTION });
}

function seedAskError(): void {
  clearAsk();
  const nonce = startTurn({ question: ASK_QUESTION });
  setAskError(nonce, ASK_QUESTION);
}

type Backdrop = "soft" | "bold" | "grid";

const BACKDROPS: { id: Backdrop; label: string }[] = [
  { id: "soft", label: "Soft" },
  { id: "bold", label: "Bold" },
  { id: "grid", label: "Grid" },
];

const SPEEDS: { factor: number; label: string }[] = [
  { factor: 1, label: "1×" },
  { factor: 3, label: "3×" },
  { factor: 10, label: "10×" },
];

const VIEWS = [
  { id: "ask", label: "Ask composer" },
  { id: "search", label: "Search" },
  { id: "new", label: "New save" },
  { id: "layout", label: "Layout" },
  { id: "zoom", label: "Zoom" },
  { id: "sort", label: "Sort" },
  { id: "display", label: "Display" },
] as const;

/** The status pill only shows while the dock rests in nav with an active ask, so each scenario seeds the store and collapses the dock. */
const STATUS_SCENARIOS = [
  { id: "thinking", label: "Thinking", seed: seedAskThinking },
  { id: "results", label: "Results found", seed: seedAskResults },
  { id: "empty", label: "No matches", seed: seedAskEmpty },
  { id: "error", label: "Error", seed: seedAskError },
] as const;

const SELECTIONS = [
  { count: 0, label: "None" },
  { count: 1, label: "1 item" },
  { count: 12, label: "12 items" },
  { count: 240, label: "240 items" },
] as const;

/** The status cell renders from the live ask store, so the Status pill scenario buttons drive it. */
const GRID_STATES: { id: string; label: string; preview: DockPreview }[] = [
  {
    id: "nav",
    label: "Nav (rest)",
    preview: { view: "nav", activeTab: "library" },
  },
  { id: "ask", label: "Ask composer", preview: { view: "ask" } },
  { id: "search", label: "Search", preview: { view: "search" } },
  { id: "status", label: "Status pill", preview: { view: "status" } },
  { id: "new", label: "New save", preview: { view: "new" } },
  { id: "layout", label: "Layout", preview: { view: "layout" } },
  { id: "zoom", label: "Zoom", preview: { view: "zoom" } },
  { id: "sort", label: "Sort", preview: { view: "sort" } },
  { id: "display", label: "Display", preview: { view: "display" } },
  {
    id: "connect-source",
    label: "Connect a source",
    preview: { view: "connect-source" },
  },
  {
    id: "connect-wait",
    label: "Connect sign-in wait",
    preview: { view: "connect-wait" },
  },
  {
    id: "watch-source",
    label: "Watch an account",
    preview: { view: "watch-source" },
  },
  {
    id: "watch-target",
    label: "Watch handle entry",
    preview: { view: "watch-target" },
  },
  {
    id: "selection",
    label: "Selection",
    preview: { view: "selection", selectionSize: 12, filteredCount: 240 },
  },
];

export function DockPlayground() {
  const navigate = useNavigate();
  const mode = useDockMode();
  const selectionSize = useSelectionSize();
  const ask = useAskResult();
  const [backdrop, setBackdrop] = useState<Backdrop>("soft");
  const [speed, setSpeed] = useState(1);

  /** The dock owns Escape while a view menu is open, so only exit from the rest state. */
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === "Escape" &&
        !e.defaultPrevented &&
        dockMode.current() === "nav"
      ) {
        void navigate({ to: "/" });
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [navigate]);

  /** The playground borrows the real dock, so stale seeds, selection, and slow-motion must not follow the user back into the app. */
  useEffect(() => {
    return () => {
      motionScale.set(1);
      clearAsk();
      selection.clear();
      dockMode.close();
    };
  }, []);

  /** The status-pill grid cell is empty without an active ask; give it content on arrival. */
  useEffect(() => {
    seedAskResults();
  }, []);

  const resolvedView =
    selectionSize > 0
      ? "selection"
      : mode !== "nav"
        ? mode
        : ask.active
          ? "status"
          : "nav";

  const rest = () => {
    selection.clear();
    clearAsk();
    dockMode.close();
  };

  return (
    <div className={styles.page} data-backdrop={backdrop}>
      <aside className={styles.panel}>
        <header className={styles.header}>
          <h1 className={styles.title}>Dock playground</h1>
          <p className={styles.subtitle}>
            The grid shows every dock state at once; the buttons drive the live
            dock below with real transitions.
          </p>
          <button
            type="button"
            aria-label="Exit playground"
            title="Exit playground (Esc)"
            className={styles.exit}
            onClick={() => void navigate({ to: "/" })}
          >
            <IconXmarkOutline12 strokeWidth={2} />
          </button>
        </header>

        <div className={styles.groups}>
          <div className={styles.group}>
            <div className={styles.groupLabel}>Showing</div>
            <div className={styles.showing}>{resolvedView}</div>
          </div>

          <div className={styles.group}>
            <div className={styles.groupLabel}>Speed</div>
            <div className={styles.segmented}>
              {SPEEDS.map((s) => (
                <button
                  key={s.factor}
                  type="button"
                  className={styles.segment}
                  data-active={s.factor === speed || undefined}
                  onClick={() => {
                    setSpeed(s.factor);
                    motionScale.set(s.factor);
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.group}>
            <div className={styles.groupLabel}>Views</div>
            <button
              type="button"
              className={styles.item}
              data-active={resolvedView === "nav" || undefined}
              onClick={rest}
            >
              Nav (rest)
            </button>
            {VIEWS.map((v) => (
              <button
                key={v.id}
                type="button"
                className={styles.item}
                data-active={
                  (mode === v.id && selectionSize === 0) || undefined
                }
                onClick={() => dockMode.open(v.id)}
              >
                {v.label}
              </button>
            ))}
          </div>

          <div className={styles.group}>
            <div className={styles.groupLabel}>Status pill</div>
            {STATUS_SCENARIOS.map((s) => (
              <button
                key={s.id}
                type="button"
                className={styles.item}
                onClick={() => {
                  s.seed();
                  dockMode.close();
                }}
              >
                {s.label}
              </button>
            ))}
            <button
              type="button"
              className={styles.item}
              onClick={() => clearAsk()}
            >
              Clear ask
            </button>
          </div>

          <div className={styles.group}>
            <div className={styles.groupLabel}>Selection</div>
            {SELECTIONS.map((s) => (
              <button
                key={s.count}
                type="button"
                className={styles.item}
                data-active={
                  (s.count === 0
                    ? selectionSize === 0
                    : selectionSize === s.count) || undefined
                }
                onClick={() =>
                  s.count === 0
                    ? selection.clear()
                    : selection.set(makeIds(s.count))
                }
              >
                {s.label}
              </button>
            ))}
            <p className={styles.hint}>
              A selection commandeers the pill; clear it to hand control back to
              the view buttons.
            </p>
          </div>

          <div className={styles.group}>
            <div className={styles.groupLabel}>Backdrop</div>
            <div className={styles.segmented}>
              {BACKDROPS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={styles.segment}
                  data-active={option.id === backdrop || undefined}
                  onClick={() => setBackdrop(option.id)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </aside>

      <main className={styles.grid} aria-label="Dock states">
        {GRID_STATES.map((state) => (
          <section key={state.id} className={styles.cell}>
            <div className={styles.cellLabel}>{state.label}</div>
            <div className={styles.cellStage}>
              <LibraryTray preview={state.preview} />
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}
