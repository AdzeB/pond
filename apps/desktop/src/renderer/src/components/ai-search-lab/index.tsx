import { IconSparkleFill18 as Sparkle } from "@pond/icons/fill/18";
import { EMPTY_QUERY } from "@pond/schema/filters/types";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { AskComposer, AskStatusPill } from "@/components/ask-bar";
import { AskChip, type ChipTone } from "@/components/ask-bar-chip";
import { AskMenuShowcase } from "@/components/ask-bar-mentions";
import { useSaves } from "@/hooks/use-saves";
import type { Save } from "@/lib/types";
import {
  type AskSegment,
  clearAsk,
  setAskError,
  setAskResult,
  setAskSummary,
  startAsk,
  startTurn,
  useAskResult,
} from "@/stores/ask-store";
import { usePrefs } from "@/stores/prefs";
import styles from "./styles.module.css";

const ASK_QUESTION = "mountain landscapes at golden hour";

// A tiny inline gradient used as the staged reference image in the visual-search
// scenario (no need for a real save to embed).
const REF_IMAGE =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7aa2ff"/><stop offset="1" stop-color="#ff9ec4"/></linearGradient></defs><rect width="64" height="64" fill="url(#g)"/></svg>',
  );

// A scenario seeds the shared ask-store so both the live composer transcript and
// the status pill render the same state. `active` is whether the status pill is a
// meaningful surface for this scenario (it only shows once an ask exists).
interface Scenario {
  id: string;
  label: string;
  caption: string;
  active: boolean;
  seed: (ctx: SeedContext) => void;
}

interface SeedContext {
  ids: string[];
  mention: AskSegment | null;
}

function seedResults(ctx: SeedContext): void {
  const segments: AskSegment[] = ctx.mention
    ? [ctx.mention, { kind: "text", text: ` ${ASK_QUESTION}` }]
    : [];
  const nonce = startTurn({ question: ASK_QUESTION, segments });
  setAskResult(nonce, ASK_QUESTION, ctx.ids.slice(0, 24), EMPTY_QUERY);
  setAskSummary(
    nonce,
    "Mostly wide alpine ranges and sunset ridgelines you saved this spring.",
  );
}

const SCENARIOS: Scenario[] = [
  {
    id: "empty",
    label: "Empty",
    caption: "Resting composer, awaiting a question.",
    active: false,
    seed: () => clearAsk(),
  },
  {
    id: "thinking",
    label: "Thinking",
    caption: "A run in flight — rotating stage narration.",
    active: true,
    seed: () => startAsk(ASK_QUESTION),
  },
  {
    id: "results",
    label: "Results",
    caption: "Resolved set with a prose summary and inline thumbnails.",
    active: true,
    seed: seedResults,
  },
  {
    id: "multi-turn",
    label: "Multi-turn",
    caption: "A follow-up refines the previous turn's result set.",
    active: true,
    seed: (ctx) => {
      seedResults(ctx);
      const followUp = "only the vertical ones";
      const n2 = startTurn({ question: followUp, refine: true });
      setAskResult(n2, followUp, ctx.ids.slice(0, 7), EMPTY_QUERY);
      setAskSummary(
        n2,
        "Seven tall, portrait-orientation shots from that set.",
      );
    },
  },
  {
    id: "visual",
    label: "Visual search",
    caption: "Image-to-image: a dropped reference ranks by CLIP.",
    active: true,
    seed: (ctx) => {
      const label = "Similar to this image";
      const nonce = startTurn({
        question: label,
        image: { url: REF_IMAGE, name: "reference.png" },
      });
      setAskResult(nonce, label, ctx.ids.slice(0, 12), EMPTY_QUERY);
      setAskSummary(
        nonce,
        "A dozen visually similar saves, closest match first.",
      );
    },
  },
  {
    id: "none",
    label: "No matches",
    caption: "Empty result with one-tap relaxations.",
    active: true,
    seed: () => {
      const nonce = startAsk(ASK_QUESTION);
      setAskResult(nonce, ASK_QUESTION, [], EMPTY_QUERY, [
        { id: "any-time", label: "Any time", query: EMPTY_QUERY, count: 42 },
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
    id: "error",
    label: "Error",
    caption: "The run failed before it could resolve.",
    active: true,
    seed: () => setAskError(startAsk(ASK_QUESTION), ASK_QUESTION),
  },
];

const FALLBACK_SCENARIO = SCENARIOS[0] as Scenario;

type Backdrop = "soft" | "bold" | "grid";

const BACKDROPS: { id: Backdrop; label: string }[] = [
  { id: "soft", label: "Soft" },
  { id: "bold", label: "Bold" },
  { id: "grid", label: "Grid" },
];

interface ChipSpec {
  tone: ChipTone;
  lead: ReactNode;
  label: string;
}

const CHIP_SPECS: ChipSpec[] = [
  {
    tone: "skill",
    lead: <Sparkle width={13} height={13} />,
    label: "/summarise",
  },
  { tone: "mention", lead: "@", label: "Design Inspiration" },
  { tone: "tag", lead: "#", label: "typography" },
];

export function AiSearchLab() {
  const saves = useSaves();
  const [skillsPrefs] = usePrefs("skills");
  const skills = useMemo(() => skillsPrefs.custom ?? [], [skillsPrefs.custom]);
  const ask = useAskResult();

  const [scenarioId, setScenarioId] = useState<string>(FALLBACK_SCENARIO.id);
  const [backdrop, setBackdrop] = useState<Backdrop>("soft");

  const scenario = useMemo(
    () => SCENARIOS.find((s) => s.id === scenarioId) ?? FALLBACK_SCENARIO,
    [scenarioId],
  );

  // Realistic ids so the inline result thumbnails render against the real
  // library; falls back to placeholders when there are no saves yet.
  const ids = useMemo(() => {
    const real = saves.filter((s) => !s.deletedAt).map((s) => s.id);
    if (real.length > 0) return real;
    return Array.from({ length: 24 }, (_, i) => `preview-${i}`);
  }, [saves]);

  const mention = useMemo<AskSegment | null>(() => {
    const first = saves.find((s: Save) => !s.deletedAt);
    if (!first) return null;
    return { kind: "mention", id: first.id, title: first.title ?? "Untitled" };
  }, [saves]);

  // Seed the shared store for the active scenario, resetting on the way out so
  // the live dock never inherits a stale transcript.
  // biome-ignore lint/correctness/useExhaustiveDependencies: keyed on scenario.id
  useEffect(() => {
    clearAsk();
    scenario.seed({ ids, mention });
    return () => clearAsk();
  }, [scenario.id, ids, mention]);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.heading}>
          <h1 className={styles.title}>AI Search Lab</h1>
          <p className={styles.subtitle}>{scenario.caption}</p>
        </div>
        <div className={styles.controls}>
          <div className={styles.segmented}>
            {SCENARIOS.map((s) => (
              <button
                key={s.id}
                type="button"
                className={styles.segment}
                data-active={s.id === scenarioId || undefined}
                onClick={() => setScenarioId(s.id)}
              >
                {s.label}
              </button>
            ))}
          </div>
          <div className={styles.segmented}>
            {BACKDROPS.map((b) => (
              <button
                key={b.id}
                type="button"
                className={styles.segment}
                data-active={b.id === backdrop || undefined}
                onClick={() => setBackdrop(b.id)}
              >
                {b.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className={styles.body}>
        <Panel
          title="Composer"
          caption="The full ask card: editor, chips, toolbar, history popover, and the chat transcript. Type / @ # to open the inline menus."
        >
          <div className={styles.stage} data-backdrop={backdrop}>
            <div className={styles.cardSurface}>
              <AskComposer
                autoFocus
                onClear={() => {
                  clearAsk();
                  setScenarioId("empty");
                }}
              />
            </div>
          </div>
        </Panel>

        <Panel
          title="Status pill"
          caption="The collapsed result pill shown in the dock once a run resolves."
        >
          <div className={styles.stage} data-backdrop={backdrop}>
            {scenario.active && ask.active ? (
              <div className={styles.pillSurface}>
                <AskStatusPill />
              </div>
            ) : (
              <p className={styles.hint}>
                Pick an active scenario to preview the pill.
              </p>
            )}
          </div>
        </Panel>

        <Panel
          title="Chips"
          caption="Inline pills for skills, save mentions, and tags — default and selected states."
        >
          <div className={styles.chipGrid}>
            {CHIP_SPECS.map((spec) => (
              <div key={spec.tone} className={styles.chipRow}>
                <span className={styles.chipToneLabel}>{spec.tone}</span>
                <AskChip
                  tone={spec.tone}
                  lead={spec.lead}
                  label={spec.label}
                  onRemove={() => {}}
                />
                <AskChip
                  tone={spec.tone}
                  lead={spec.lead}
                  label={spec.label}
                  selected
                  onRemove={() => {}}
                />
              </div>
            ))}
          </div>
        </Panel>

        <Panel
          title="Mentions menu"
          caption="The caret-anchored typeahead, rendered statically with your live skills, saves, and tags."
        >
          <div className={styles.menuStage}>
            <AskMenuShowcase skills={skills} saves={saves} />
          </div>
        </Panel>
      </div>
    </div>
  );
}

function Panel({
  title,
  caption,
  children,
}: {
  title: string;
  caption: string;
  children: ReactNode;
}) {
  return (
    <section className={styles.panel}>
      <div className={styles.panelHead}>
        <h2 className={styles.panelTitle}>{title}</h2>
        <p className={styles.panelCaption}>{caption}</p>
      </div>
      {children}
    </section>
  );
}
