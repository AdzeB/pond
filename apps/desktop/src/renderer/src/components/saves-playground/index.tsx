import { IconXmarkOutline12 } from "@pond/icons/outline/12";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { type MockSaves, type Scenario, useMockSaves } from "./lib/mock";
import styles from "./styles.module.css";
import { VariantAttention } from "./variant-attention";
import { VariantBanner } from "./variant-banner";
import { VariantConsole } from "./variant-console";
import { VariantDownloads } from "./variant-downloads";
import { VariantFeed } from "./variant-feed";
import { VariantGrid } from "./variant-grid";
import { VariantGrouped } from "./variant-grouped";
import { VariantQuiet } from "./variant-quiet";
import { VariantTray } from "./variant-tray";

/** Dev-only gallery of Saves page prototypes; all variants share one ticking mock queue so switching compares layout, not data. */

type VariantId =
  | "grouped"
  | "attention"
  | "feed"
  | "downloads"
  | "console"
  | "quiet"
  | "banner"
  | "tray"
  | "grid";

interface Variant {
  label: string;
  blurb: string;
  component: React.ComponentType<{ saves: MockSaves }>;
}

const VARIANT_IDS: readonly VariantId[] = [
  "grouped",
  "attention",
  "feed",
  "downloads",
  "console",
  "quiet",
  "banner",
  "tray",
  "grid",
];

const VARIANTS: Record<VariantId, Variant> = {
  grouped: {
    label: "A · Grouped queue",
    blurb:
      "Failed, Saving and Saved sections, each carrying its one action inline. What the real page ships today.",
    component: VariantGrouped,
  },
  attention: {
    label: "B · Attention-first",
    blurb:
      "The page is a health answer. A status hero up top, failures as actionable cards, everything else folded away.",
    component: VariantAttention,
  },
  feed: {
    label: "C · Activity feed",
    blurb:
      "One chronological thread with status dots, like a quiet log. No sections; failures just read differently.",
    component: VariantFeed,
  },
  downloads: {
    label: "D · Downloads manager",
    blurb:
      "Safari-downloads shape: one flat card, progress as the hero, session totals in a sticky footer.",
    component: VariantDownloads,
  },
  console: {
    label: "E · Pipeline console",
    blurb:
      "Power-user take. Rows expand into the real op checklist (read, download, archive, finalize) so failures show exactly where they died.",
    component: VariantConsole,
  },
  quiet: {
    label: "F · Quiet summary",
    blurb:
      "The whole page is one sentence and a progress ring. Only failures ever earn rows. Trust surface, not a list.",
    component: VariantQuiet,
  },
  banner: {
    label: "G · Session manager",
    blurb:
      "AWS-transfer shape: an aggregate banner owns the session (overall %, stop, retry), rows underneath are pure status.",
    component: VariantBanner,
  },
  tray: {
    label: "H · Floating tray",
    blurb:
      "Proton Drive shape: no page at all. A collapsible panel pinned over the library with All / Active / Done / Failed tabs.",
    component: VariantTray,
  },
  grid: {
    label: "I · In-place grid",
    blurb:
      "Frame.io shape: saves appear as library tiles immediately; in-flight ones carry a progress ring on the tile itself.",
    component: VariantGrid,
  },
};

const SCENARIO_IDS: readonly Scenario[] = [
  "mixed",
  "failures",
  "heavy",
  "clear",
];

const SCENARIOS: Record<Scenario, { label: string; blurb: string }> = {
  mixed: {
    label: "Mixed activity",
    blurb:
      "A few items saving with live progress, one failure, a handful landed. The everyday case.",
  },
  failures: {
    label: "Failures",
    blurb:
      "Four different failure reasons and nothing in flight. Tests whether the page earns its keep as a fix-it surface.",
  },
  heavy: {
    label: "Heavy sync",
    blurb:
      "Twenty-plus items streaming in at once, like a first Pinterest sync. Tests density and scanability.",
  },
  clear: {
    label: "All clear",
    blurb:
      "Nothing saving, nothing failed. The state the page is in 90% of the time; it should be calm, not empty-feeling.",
  },
};

export function SavesPlayground() {
  const navigate = useNavigate();
  const [variant, setVariant] = useState<VariantId>("grouped");
  const [scenario, setScenario] = useState<Scenario>("mixed");
  const saves = useMockSaves(scenario);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !e.defaultPrevented) {
        void navigate({ to: "/" });
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [navigate]);

  const active = VARIANTS[variant];
  const Active = active.component;

  return (
    <div className={styles.page}>
      <aside className={styles.panel}>
        <header className={styles.header}>
          <h1 className={styles.title}>Saves prototypes</h1>
          <p className={styles.subtitle}>
            Nine takes on the Saves page. The queue is mocked and ticks live, so
            switching compares layout only.
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
            <div className={styles.groupLabel}>Variants</div>
            {VARIANT_IDS.map((id) => (
              <button
                key={id}
                type="button"
                className={styles.item}
                data-active={id === variant || undefined}
                onClick={() => setVariant(id)}
              >
                {VARIANTS[id].label}
              </button>
            ))}
            <p className={styles.hint}>{active.blurb}</p>
          </div>

          <div className={styles.group}>
            <div className={styles.groupLabel}>Scenarios</div>
            {SCENARIO_IDS.map((id) => (
              <button
                key={id}
                type="button"
                className={styles.item}
                data-active={id === scenario || undefined}
                onClick={() => setScenario(id)}
              >
                {SCENARIOS[id].label}
              </button>
            ))}
            <p className={styles.hint}>{SCENARIOS[scenario].blurb}</p>
          </div>
        </div>
      </aside>

      <main className={styles.stage}>
        <div className={styles.sheet}>
          <header className={styles.sheetHeader}>
            <h2 className={styles.sheetTitle}>Saves</h2>
            <p className={styles.sheetDescription}>
              Confirm that what you saved landed, and fix it when it didn't.
            </p>
          </header>
          <Active saves={saves} />
        </div>
      </main>
    </div>
  );
}
