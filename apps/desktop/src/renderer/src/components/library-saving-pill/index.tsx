import { IconCheck3Outline12 as Check } from "@pond/icons/outline/12";
import { Calligraph } from "calligraph";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { useIngestingCount, useIngestingProgressSum } from "@/hooks/use-saves";
import { bouncySpring } from "@/lib/ui/motion";
import { formatNumber } from "@/lib/util/format";
import { settingsModal } from "@/stores/settings-modal";
import styles from "./styles.module.css";

const RADIUS = 7;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
/** How long the "Saved n items" state lingers before the pill sinks away. */
const DONE_HOLD_MS = 2200;

type Phase = "idle" | "saving" | "done";

/** The batch total only grows while live, so the label stays stable instead of counting down as items finish. */
function useSavingBatch(): { phase: Phase; total: number; progress: number } {
  const count = useIngestingCount();
  const progressSum = useIngestingProgressSum();

  const [phase, setPhase] = useState<Phase>("idle");
  const [total, setTotal] = useState(0);
  const prevCount = useRef(0);
  const doneTimer = useRef<number | null>(null);

  useEffect(() => {
    const prev = prevCount.current;
    prevCount.current = count;

    if (count > 0) {
      if (doneTimer.current !== null) {
        clearTimeout(doneTimer.current);
        doneTimer.current = null;
      }
      if (phase !== "saving") {
        /** Fresh batch: from idle, or new saves arriving while "done" lingers. */
        setTotal(count);
        setPhase("saving");
      } else if (count > prev) {
        setTotal((t) => t + (count - prev));
      }
      return;
    }

    if (phase === "saving") {
      setPhase("done");
      doneTimer.current = window.setTimeout(() => {
        doneTimer.current = null;
        setPhase("idle");
        setTotal(0);
      }, DONE_HOLD_MS);
    }
  }, [count, phase]);

  useEffect(
    () => () => {
      if (doneTimer.current !== null) clearTimeout(doneTimer.current);
    },
    [],
  );

  const settled = Math.max(0, total - count);
  const progress =
    phase === "done"
      ? 1
      : total > 0
        ? Math.min(1, (settled + progressSum) / total)
        : 0;

  return { phase, total, progress };
}

export function SavingPill() {
  const { phase, total, progress } = useSavingBatch();
  const reduceMotion = useReducedMotion();

  const pillMotion = reduceMotion
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
      }
    : {
        initial: { opacity: 0, y: 10, scale: 0.92 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, y: 10, scale: 0.92 },
      };

  const noun = total === 1 ? "item" : "items";

  return (
    <AnimatePresence>
      {phase !== "idle" && total > 0 ? (
        <motion.button
          key="saving-pill"
          type="button"
          className={styles.pill}
          data-phase={phase}
          aria-label="Show saves"
          onClick={() => settingsModal.open("saves")}
          {...pillMotion}
          transition={bouncySpring}
        >
          <span className={styles.ring} aria-hidden>
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 18 18">
              <circle
                className={styles.track}
                cx="9"
                cy="9"
                r={RADIUS}
                fill="none"
                strokeWidth="2.5"
              />
              <circle
                className={styles.fill}
                cx="9"
                cy="9"
                r={RADIUS}
                fill="none"
                strokeWidth="2.5"
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={CIRCUMFERENCE * (1 - progress)}
              />
            </svg>
            <span className={styles.check}>
              <Check width={11} height={11} />
            </span>
          </span>
          <span className={styles.label}>
            <Calligraph>{phase === "done" ? "Saved" : "Saving"}</Calligraph>{" "}
            <Calligraph className={styles.count} variant="number">
              {formatNumber(total)}
            </Calligraph>{" "}
            <Calligraph>{noun}</Calligraph>
          </span>
        </motion.button>
      ) : null}
    </AnimatePresence>
  );
}
