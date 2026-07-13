import {
  IconSparkle3Fill18 as Sparkle,
  IconCircleStopFill18 as Stop,
} from "@pond/icons/fill/18";
import { IconXmarkOutline18 as Clear } from "@pond/icons/outline/18";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { runAskSuggestion } from "@/hooks/use-ask";
import { bouncySpring } from "@/lib/ui/motion";
import { formatNumber } from "@/lib/util/format";
import { clearAsk, useAskResult } from "@/stores/ask-store";
import styles from "../styles.module.css";
import { STAGE_LABELS } from "./stage-labels";

interface StatusPillProps {
  onReopen?: () => void;
  onClear?: () => void;
}

/** Collapsed status pill; a run that finds nothing offers one-tap relaxations, one that finds something offers actions on the set. */
export function AskStatusPill({ onReopen, onClear }: StatusPillProps) {
  const ask = useAskResult();
  const reduceMotion = useReducedMotion();
  const thinking = ask.status === "thinking";
  const done = ask.status === "done";
  /** Busy includes the post-search summary pass so the narration keeps animating until the prose is ready. */
  const busy = thinking || ask.summaryStatus === "loading";
  const stageLabel = ask.stage ? STAGE_LABELS[ask.stage] : "Thinking…";
  const hasAnswer = ask.answer.length > 0;
  const hasSummary = ask.summaryStatus === "done" && ask.summary.length > 0;
  const detail = hasAnswer
    ? ask.answer
    : hasSummary
      ? ask.summary
      : ask.question;
  const showSuggestions =
    done && ask.count === 0 && !hasAnswer && ask.suggestions.length > 0;

  const labelMotion = reduceMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0, y: 6 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -6 },
      };

  return (
    <div className={styles["status-pill"]}>
      <button
        type="button"
        className={styles["avatar-button"]}
        aria-label="Ask again"
        onClick={() => onReopen?.()}
      >
        <Sparkle width={16} height={16} />
      </button>

      <span className={styles["status-text"]}>
        {busy ? (
          <span className={styles.label} role="status">
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
        ) : ask.status === "error" ? (
          <span className={styles.label}>Couldn’t search</span>
        ) : ask.count === 0 ? (
          hasAnswer ? (
            <span className={styles.label}>Answer</span>
          ) : (
            <span className={styles.label}>No matches</span>
          )
        ) : (
          <>
            <motion.span
              key={ask.count}
              className={styles.count}
              initial={reduceMotion ? false : { opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              transition={bouncySpring}
            >
              {formatNumber(ask.count)}
            </motion.span>
            <span className={styles.label}>found</span>
          </>
        )}
        {!busy && !showSuggestions && detail ? (
          <>
            <span className={styles.separator} aria-hidden>
              ·
            </span>
            <span className={styles.detail}>{detail}</span>
          </>
        ) : null}
      </span>

      {showSuggestions ? (
        <span className={styles.suggestions}>
          {ask.suggestions.map((s) => (
            <button
              key={s.id}
              type="button"
              className={styles.suggestion}
              onClick={() => runAskSuggestion(s)}
            >
              {s.label}
              <span className={styles["suggestion-count"]}>{s.count}</span>
            </button>
          ))}
        </span>
      ) : null}

      <button
        type="button"
        className={styles["end-button"]}
        aria-label={busy ? "Stop" : "Clear results"}
        onClick={() => (busy ? clearAsk() : onClear?.())}
      >
        {busy ? (
          <Stop width={16} height={16} />
        ) : (
          <Clear width={14} height={14} />
        )}
      </button>
    </div>
  );
}
