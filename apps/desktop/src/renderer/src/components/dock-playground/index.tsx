import { EMPTY_QUERY } from "@pond/schema/filters/types";
import { useEffect, useMemo, useState } from "react";
import { Dock, type DockPreview } from "@/components/library-dock";
import {
  clearAsk,
  setAskError,
  setAskResult,
  setAskSummary,
  startAsk,
  startTurn,
} from "@/stores/ask-store";
import styles from "./styles.module.css";

// A single node in the dock's state machine: the exact `DockPreview` that drives
// the pill, plus an optional `seed` that primes the ask store for views (status,
// ask) whose inner content is read straight from that store.
interface DockState {
  id: string;
  label: string;
  caption: string;
  preview: DockPreview;
  seed?: () => void;
}

interface DockStateGroup {
  label: string;
  states: DockState[];
}

const makeIds = (count: number): string[] =>
  Array.from({ length: count }, (_, i) => `preview-${i}`);

const ASK_QUESTION = "mountain landscapes at golden hour";

// A tiny inline gradient used as the staged reference image in the visual-search
// preview (the playground has no real saves to embed).
const REF_IMAGE =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7aa2ff"/><stop offset="1" stop-color="#ff9ec4"/></linearGradient></defs><rect width="64" height="64" fill="url(#g)"/></svg>',
  );

const GROUPS: DockStateGroup[] = [
  {
    label: "Navigation",
    states: [
      {
        id: "nav-library",
        label: "Library",
        caption: "Default resting state, Library tab active.",
        preview: { view: "nav", activeTab: "library" },
      },
      {
        id: "nav-sources",
        label: "Sources",
        caption: "Sources tab active.",
        preview: { view: "nav", activeTab: "sources" },
      },
      {
        id: "nav-trash",
        label: "Trash",
        caption: "Trash tab active.",
        preview: { view: "nav", activeTab: "trash" },
      },
    ],
  },
  {
    label: "Selection",
    states: [
      {
        id: "sel-single",
        label: "One selected",
        caption: "A single item picked out of the view.",
        preview: {
          view: "selection",
          selectionSize: 1,
          filteredCount: 240,
        },
      },
      {
        id: "sel-multi",
        label: "Several selected",
        caption: "A subset selected — shows the count / total split.",
        preview: {
          view: "selection",
          selectionSize: 12,
          filteredCount: 240,
        },
      },
      {
        id: "sel-all",
        label: "All selected",
        caption: "Everything in the view is selected.",
        preview: {
          view: "selection",
          selectionSize: 240,
          filteredCount: 240,
          allSelected: true,
        },
      },
      {
        id: "sel-trash",
        label: "Selected in Trash",
        caption: "Destructive action flips to Restore inside Trash.",
        preview: {
          view: "selection",
          selectionSize: 3,
          filteredCount: 18,
          inTrash: true,
        },
      },
    ],
  },
  {
    label: "Ask composer",
    states: [
      {
        id: "ask-empty",
        label: "Composer open",
        caption: "Expanded card, awaiting a question.",
        preview: { view: "ask" },
        seed: () => clearAsk(),
      },
      {
        id: "ask-results",
        label: "Composer with results",
        caption: "Results resolved while the composer stays open.",
        preview: { view: "ask" },
        seed: () => {
          const nonce = startAsk(ASK_QUESTION);
          setAskResult(nonce, ASK_QUESTION, makeIds(24), EMPTY_QUERY);
          setAskSummary(
            nonce,
            "Mostly wide alpine ranges and sunset ridgelines you saved this spring.",
          );
        },
      },
      {
        id: "ask-conversation",
        label: "Multi-turn conversation",
        caption: "A follow-up refines the previous turn's result set.",
        preview: { view: "ask" },
        seed: () => {
          const n1 = startAsk(ASK_QUESTION);
          setAskResult(n1, ASK_QUESTION, makeIds(24), EMPTY_QUERY);
          setAskSummary(
            n1,
            "Mostly wide alpine ranges and sunset ridgelines you saved this spring.",
          );
          const followUp = "only the vertical ones";
          const n2 = startTurn({ question: followUp, refine: true });
          setAskResult(n2, followUp, makeIds(7), EMPTY_QUERY);
          setAskSummary(
            n2,
            "Seven tall, portrait-orientation shots from that set.",
          );
        },
      },
      {
        id: "ask-visual",
        label: "Visual search",
        caption: "Image-to-image: a dropped reference ranks by CLIP.",
        preview: { view: "ask" },
        seed: () => {
          const label = "Similar to this image";
          const nonce = startTurn({
            question: label,
            image: { url: REF_IMAGE, name: "reference.png" },
          });
          setAskResult(nonce, label, makeIds(12), EMPTY_QUERY);
          setAskSummary(
            nonce,
            "A dozen visually similar saves, closest match first.",
          );
        },
      },
    ],
  },
  {
    label: "Status pill",
    states: [
      {
        id: "status-thinking",
        label: "Thinking",
        caption: "Run in flight — animated border beam and rotating narration.",
        preview: { view: "status" },
        seed: () => startAsk(ASK_QUESTION),
      },
      {
        id: "status-results",
        label: "Results found",
        caption: "Collapsed pill showing the count and a summary.",
        preview: { view: "status" },
        seed: () => {
          const nonce = startAsk(ASK_QUESTION);
          setAskResult(nonce, ASK_QUESTION, makeIds(24), EMPTY_QUERY);
          setAskSummary(
            nonce,
            "Mostly wide alpine ranges and sunset ridgelines you saved this spring.",
          );
        },
      },
      {
        id: "status-empty",
        label: "No matches",
        caption: "Empty result with one-tap relaxations.",
        preview: { view: "status" },
        seed: () => {
          const nonce = startAsk(ASK_QUESTION);
          setAskResult(nonce, ASK_QUESTION, [], EMPTY_QUERY, [
            {
              id: "any-time",
              label: "Any time",
              query: EMPTY_QUERY,
              count: 42,
            },
            {
              id: "drop-tag",
              label: "Without #travel",
              query: EMPTY_QUERY,
              count: 18,
            },
          ]);
        },
      },
      {
        id: "status-error",
        label: "Error",
        caption: "The run failed before it could resolve.",
        preview: { view: "status" },
        seed: () => {
          const nonce = startAsk(ASK_QUESTION);
          setAskError(nonce, ASK_QUESTION);
        },
      },
    ],
  },
];

const FLAT_STATES: DockState[] = GROUPS.flatMap((group) => group.states);

// GROUPS is a non-empty literal, so a first state always exists; the cast keeps
// `selected` non-nullable under `noUncheckedIndexedAccess`.
const FALLBACK_STATE = FLAT_STATES[0] as DockState;

type Backdrop = "soft" | "bold" | "grid";

const BACKDROPS: { id: Backdrop; label: string }[] = [
  { id: "soft", label: "Soft" },
  { id: "bold", label: "Bold" },
  { id: "grid", label: "Grid" },
];

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA"
  );
}

export function DockPlayground() {
  const [selectedId, setSelectedId] = useState<string>(FALLBACK_STATE.id);
  const [backdrop, setBackdrop] = useState<Backdrop>("soft");

  const selected = useMemo(
    () => FLAT_STATES.find((s) => s.id === selectedId) ?? FALLBACK_STATE,
    [selectedId],
  );

  // Prime the ask store for the active state, and always reset it on the way out
  // so the live dock never inherits a stale "thinking" run.
  // biome-ignore lint/correctness/useExhaustiveDependencies: keyed on selected.id
  useEffect(() => {
    clearAsk();
    selected.seed?.();
    return () => clearAsk();
  }, [selected.id]);

  // Arrow keys flip through the flat list, except while typing in the composer.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
      if (isEditableTarget(event.target)) return;
      event.preventDefault();
      const index = FLAT_STATES.findIndex((s) => s.id === selectedId);
      const delta = event.key === "ArrowDown" ? 1 : -1;
      const next = (index + delta + FLAT_STATES.length) % FLAT_STATES.length;
      const nextState = FLAT_STATES[next];
      if (nextState) setSelectedId(nextState.id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId]);

  return (
    <div className={styles.page}>
      <aside className={styles.sidebar}>
        <header className={styles.sidebarHeader}>
          <h1 className={styles.title}>Dock states</h1>
          <p className={styles.subtitle}>
            {FLAT_STATES.length} states · ↑ ↓ to step through
          </p>
        </header>

        <nav className={styles.list}>
          {GROUPS.map((group) => (
            <div key={group.label} className={styles.group}>
              <div className={styles.groupLabel}>{group.label}</div>
              {group.states.map((state) => (
                <button
                  key={state.id}
                  type="button"
                  className={styles.stateButton}
                  data-active={state.id === selectedId || undefined}
                  onClick={() => setSelectedId(state.id)}
                >
                  {state.label}
                </button>
              ))}
            </div>
          ))}
        </nav>
      </aside>

      <main className={styles.main}>
        <div className={styles.toolbar}>
          <div className={styles.toolbarMeta}>
            <span className={styles.toolbarLabel}>{selected.label}</span>
            <span className={styles.toolbarCaption}>{selected.caption}</span>
          </div>
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

        <div className={styles.stage} data-backdrop={backdrop}>
          <div className={styles.stageInner}>
            <Dock.Root preview={selected.preview} />
          </div>
        </div>

        <pre className={styles.code}>
          {JSON.stringify(selected.preview, null, 2)}
        </pre>
      </main>
    </div>
  );
}
