import { IconXmarkOutline12 } from "@pond/icons/outline/12";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  type ToastEngine,
  useToastEngine,
  type VariantProps,
} from "./lib/engine";
import styles from "./styles.module.css";
import { VariantBottomLeft } from "./variant-bottom-left";
import { VariantCapsule } from "./variant-capsule";
import { VariantCornerNative } from "./variant-corner-native";
import { VariantDockMorph } from "./variant-dock-morph";
import { VariantDockRise } from "./variant-dock-rise";
import { VariantInsetCard } from "./variant-inset-card";
import { VariantIsland } from "./variant-island";
import { VariantProgress } from "./variant-progress";
import { VariantStatusSlot } from "./variant-status-slot";

/** Dev-only gallery of candidate feedback systems to replace the top-center toast stack. */

type VariantId =
  | "dock-rise"
  | "dock-morph"
  | "status-slot"
  | "corner-native"
  | "bottom-left"
  | "capsule"
  | "inset-card"
  | "progress"
  | "island";

interface Variant {
  label: string;
  blurb: string;
  component: React.ComponentType<VariantProps>;
}

const GROUPS: { label: string; ids: readonly VariantId[] }[] = [
  {
    label: "Placement",
    ids: [
      "dock-rise",
      "dock-morph",
      "status-slot",
      "corner-native",
      "bottom-left",
    ],
  },
  { label: "Finish", ids: ["capsule", "inset-card", "progress", "island"] },
];

const VARIANTS: Record<VariantId, Variant> = {
  "dock-rise": {
    label: "A · Dock rise",
    blurb:
      "Toasts surface from behind the dock and stack upward, where the saving pill already lives. Feedback keeps to the app's one anchor instead of claiming the top edge.",
    component: VariantDockRise,
  },
  "dock-morph": {
    label: "B · Dock morph",
    blurb:
      "No second surface at all: the pill itself briefly becomes the message, then morphs back. The quietest possible system, at the cost of hiding the dock while it speaks.",
    component: VariantDockMorph,
  },
  "status-slot": {
    label: "C · Status slot",
    blurb:
      "One slot above the dock, one message at a time. New feedback replaces the current line instead of stacking; a badge hints at what's queued behind it.",
    component: VariantStatusSlot,
  },
  "corner-native": {
    label: "D · Corner native",
    blurb:
      "Top-right cards in the Notification Center register, with a leading glyph and a small header. Tests whether native familiarity beats bespoke quiet.",
    component: VariantCornerNative,
  },
  "bottom-left": {
    label: "E · Corner log",
    blurb:
      "A dense, log-like feed in the bottom-left corner. Reads as ambient history rather than interruption; built for power users who want receipts.",
    component: VariantBottomLeft,
  },
  capsule: {
    label: "F · Capsule",
    blurb:
      "A finish pass on the rise placement: tone icon, tighter type, ghost undo, and a springier entrance.",
    component: VariantCapsule,
  },
  "inset-card": {
    label: "G · Inset card",
    blurb:
      "A slightly larger card that splits long messages into title and body, entering with the dock's blur crossfade. For feedback that needs a second line.",
    component: VariantInsetCard,
  },
  progress: {
    label: "H · Progress",
    blurb:
      "The saving pill's ring folded into the toast system: determinate progress for long jobs, tone icons for the rest, a check when work lands.",
    component: VariantProgress,
  },
  island: {
    label: "I · Island",
    blurb:
      "A dynamic-island take: one black surface above the dock that morphs to fit each message, swaps content with a soft blur, and splits a counter lobe off its side when toasts queue.",
    component: VariantIsland,
  },
};

const SCENARIOS: {
  id: string;
  label: string;
  fire: (engine: ToastEngine) => void;
}[] = [
  {
    id: "info",
    label: "Info",
    fire: (engine) => engine.push({ message: "Copied 12 links." }),
  },
  {
    id: "success",
    label: "Success",
    fire: (engine) =>
      engine.push({ message: "Tagged 12 items.", tone: "success" }),
  },
  {
    id: "error",
    label: "Error",
    fire: (engine) =>
      engine.push({ message: "Export failed. Try again.", tone: "error" }),
  },
  {
    id: "undo",
    label: "With undo",
    fire: (engine) =>
      engine.push({ message: "Moved 16 items to Trash.", actionLabel: "Undo" }),
  },
  {
    id: "long",
    label: "Long message",
    fire: (engine) =>
      engine.push({
        message:
          "Embedding 240 items again in the background. This can take a while on large libraries.",
      }),
  },
  {
    id: "stack",
    label: "Stack of three",
    fire: (engine) => {
      engine.push({ message: "Copied 12 links." });
      engine.push({ message: "Tagged 12 items.", tone: "success" });
      engine.push({ message: "Export failed. Try again.", tone: "error" });
    },
  },
  {
    id: "job",
    label: "Progress job",
    fire: (engine) =>
      engine.push({
        message: "Exporting 240 files.",
        job: { ms: 3500, doneMessage: "Exported 240 files." },
      }),
  },
];

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

export function ToastPlayground() {
  const navigate = useNavigate();
  const [variant, setVariant] = useState<VariantId>("dock-rise");
  const [backdrop, setBackdrop] = useState<Backdrop>("soft");
  const [speed, setSpeed] = useState(1);
  const engine = useToastEngine(speed);
  const { clear } = engine;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !e.defaultPrevented) {
        void navigate({ to: "/" });
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [navigate]);

  /** A variant owns its own stacking rules; carrying live toasts across the switch shows half-transitioned states. */
  const selectVariant = (id: VariantId) => {
    clear();
    setVariant(id);
  };

  const active = VARIANTS[variant];
  const Active = active.component;

  return (
    <div className={styles.page}>
      <aside className={styles.panel}>
        <header className={styles.header}>
          <h1 className={styles.title}>Toast prototypes</h1>
          <p className={styles.subtitle}>
            Candidate feedback systems to replace the top-center toast stack.
            Fire scenarios below; each prototype owns its own placement, motion,
            and dismissal.
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
          {GROUPS.map((group) => (
            <div key={group.label} className={styles.group}>
              <div className={styles.groupLabel}>{group.label}</div>
              {group.ids.map((id) => (
                <button
                  key={id}
                  type="button"
                  className={styles.item}
                  data-active={id === variant || undefined}
                  onClick={() => selectVariant(id)}
                >
                  {VARIANTS[id].label}
                </button>
              ))}
              {group.ids.includes(variant) ? (
                <p className={styles.hint}>{active.blurb}</p>
              ) : null}
            </div>
          ))}

          <div className={styles.group}>
            <div className={styles.groupLabel}>Scenarios</div>
            {SCENARIOS.map((scenario) => (
              <button
                key={scenario.id}
                type="button"
                className={styles.item}
                onClick={() => scenario.fire(engine)}
              >
                {scenario.label}
              </button>
            ))}
            <button type="button" className={styles.item} onClick={clear}>
              Clear all
            </button>
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
                  onClick={() => setSpeed(s.factor)}
                >
                  {s.label}
                </button>
              ))}
            </div>
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

      <main
        className={styles.stage}
        data-backdrop={backdrop}
        aria-label="Toast prototype"
      >
        <Active
          toasts={engine.toasts}
          dismiss={engine.dismiss}
          timeScale={speed}
        />
      </main>
    </div>
  );
}
