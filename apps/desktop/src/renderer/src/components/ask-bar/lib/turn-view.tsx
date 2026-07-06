import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useMemo } from "react";
import { runAskSuggestion } from "@/hooks/use-ask";
import { representativeImageUrl } from "@/lib/enrichment/image";
import { bouncySpring } from "@/lib/ui/motion";
import { formatNumber } from "@/lib/util/format";
import type { AskSegment, AskTurn } from "@/stores/ask-store";
import { pool } from "@/stores/pool";
import styles from "../styles.module.css";
import { STAGE_LABELS } from "./stage-labels";

// How many result thumbnails to show inline under an assistant turn.
const MAX_THUMBS = 6;

interface TurnActionHandlers {
  onSelect: () => void;
  onTag: () => void;
  onTrash: () => void;
  onSaveView: () => void;
}

// Render one piece of the sent message: free text inline, or a chip styled to
// match how it looked in the composer (mention `@`, tag `#`, skill `/`).
function TurnSegment({ segment }: { segment: AskSegment }) {
  if (segment.kind === "text") return <>{segment.text}</>;
  const label =
    segment.kind === "mention"
      ? `@${segment.title}`
      : segment.kind === "tag"
        ? `#${segment.tag}`
        : `/${segment.name}`;
  return (
    <span className={styles["user-chip"]} data-kind={segment.kind}>
      {label}
    </span>
  );
}

// One conversation exchange: the user's question (+ optional image) above the
// assistant's status, prose summary, inline result thumbnails, and — on the
// latest turn — actions on the result set.
export function TurnView({
  turn,
  isLast,
  onOpenSave,
  onRetry,
  actions,
}: {
  turn: AskTurn;
  isLast: boolean;
  onOpenSave: (id: string) => void;
  onRetry?: () => void;
  actions: TurnActionHandlers | null;
}) {
  const reduceMotion = useReducedMotion();
  const busy = turn.status === "thinking" || turn.summaryStatus === "loading";
  const stageLabel = turn.stage ? STAGE_LABELS[turn.stage] : "Thinking…";
  const hasAnswer = turn.answer.length > 0;
  const hasSummary = turn.summaryStatus === "done" && turn.summary.length > 0;
  const showSuggestions =
    turn.status === "done" &&
    turn.count === 0 &&
    !hasAnswer &&
    turn.suggestions.length > 0;

  const labelMotion = reduceMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0, y: 6 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -6 },
      };

  return (
    <div className={styles.turn}>
      <div className={styles["user-message"]}>
        {turn.image ? (
          <img className={styles["user-image"]} src={turn.image.url} alt="" />
        ) : null}
        {turn.segments.length > 0 ? (
          <span className={styles["user-text"]}>
            {turn.segments.map((seg, i) => (
              // Segments are a fixed, ordered snapshot of the sent message; the
              // index is a stable identity here.
              // biome-ignore lint/suspicious/noArrayIndexKey: positional segments
              <TurnSegment key={`${seg.kind}-${i}`} segment={seg} />
            ))}
          </span>
        ) : turn.question ? (
          <span className={styles["user-text"]}>{turn.question}</span>
        ) : null}
      </div>

      <div className={styles["assistant-message"]}>
        <div className={styles["turn-status"]}>
          {busy ? (
            <span className={styles["status-line"]} role="status">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={stageLabel}
                  {...labelMotion}
                  transition={bouncySpring}
                >
                  {stageLabel}
                </motion.span>
              </AnimatePresence>
            </span>
          ) : turn.status === "error" ? (
            <span className={styles["status-line"]}>
              Couldn’t search
              {onRetry ? (
                <button
                  type="button"
                  className={styles.retry}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={onRetry}
                >
                  Retry
                </button>
              ) : null}
            </span>
          ) : turn.count === 0 ? (
            hasAnswer ? null : (
              <span className={styles["status-line"]}>No matches</span>
            )
          ) : (
            <span className={styles["status-line"]}>
              <span className={styles.count}>{formatNumber(turn.count)}</span>
              <span className={styles["result-label"]}>found</span>
            </span>
          )}
        </div>

        {hasAnswer ? (
          <p className={styles["turn-body"]}>{turn.answer}</p>
        ) : null}

        {hasSummary && !hasAnswer ? (
          <p className={styles["turn-body"]}>{turn.summary}</p>
        ) : null}

        {turn.status === "done" && turn.count > 0 ? (
          <TurnResults ids={turn.ids} onOpenSave={onOpenSave} />
        ) : null}

        {showSuggestions ? (
          <div className={styles.suggestions}>
            {turn.suggestions.map((s) => (
              <button
                key={s.id}
                type="button"
                className={styles.suggestion}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => runAskSuggestion(s)}
              >
                {s.label}
                <span className={styles["suggestion-count"]}>{s.count}</span>
              </button>
            ))}
          </div>
        ) : null}

        {isLast && actions ? (
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.action}
              onMouseDown={(e) => e.preventDefault()}
              onClick={actions.onSelect}
            >
              Select
            </button>
            <button
              type="button"
              className={styles.action}
              onMouseDown={(e) => e.preventDefault()}
              onClick={actions.onTag}
            >
              Tag…
            </button>
            <button
              type="button"
              className={styles.action}
              onMouseDown={(e) => e.preventDefault()}
              onClick={actions.onSaveView}
            >
              Save as view
            </button>
            <button
              type="button"
              className={`${styles.action} ${styles["action-danger"]}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={actions.onTrash}
            >
              Trash
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

// Inline thumbnail strip of the top matches for a resolved turn.
function TurnResults({
  ids,
  onOpenSave,
}: {
  ids: ReadonlyArray<string>;
  onOpenSave: (id: string) => void;
}) {
  const items = useMemo(() => {
    const out: { id: string; url: string | null }[] = [];
    for (const id of ids.slice(0, MAX_THUMBS)) {
      const save = pool.get(id);
      if (!save) continue;
      out.push({ id, url: representativeImageUrl(save) });
    }
    return out;
  }, [ids]);

  if (items.length === 0) return null;
  const more = ids.length - items.length;

  return (
    <div className={styles.thumbs}>
      {items.map((it) => (
        <button
          key={it.id}
          type="button"
          className={styles.thumb}
          aria-label="Open save"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onOpenSave(it.id)}
        >
          {it.url ? (
            <img src={it.url} alt="" />
          ) : (
            <span className={styles["thumb-blank"]} />
          )}
        </button>
      ))}
      {more > 0 ? (
        <span className={styles["thumb-more"]}>+{formatNumber(more)}</span>
      ) : null}
    </div>
  );
}
