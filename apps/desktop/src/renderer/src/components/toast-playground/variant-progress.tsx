import { IconCheck3Outline12 as Check } from "@pond/icons/outline/12";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { PlaygroundToast, VariantProps } from "./lib/engine";
import { DockStage, fadePreset, ToneIcon } from "./lib/parts";
import css from "./variants.module.css";

const RADIUS = 7;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function Ring({ toast }: { toast: PlaygroundToast }) {
  return (
    <span className={css.ring} data-done={toast.done || undefined} aria-hidden>
      <svg aria-hidden="true" width="18" height="18" viewBox="0 0 18 18">
        <circle
          className={css.ringTrack}
          cx="9"
          cy="9"
          r={RADIUS}
          fill="none"
          strokeWidth="2.5"
        />
        <circle
          className={css.ringFill}
          cx="9"
          cy="9"
          r={RADIUS}
          fill="none"
          strokeWidth="2.5"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - (toast.progress ?? 0))}
        />
      </svg>
      <span className={css.ringCheck}>
        <Check width={11} height={11} />
      </span>
    </span>
  );
}

/** The saving pill's ring folded into the toast system: determinate progress for jobs, tone icons for the rest. */
export function VariantProgress({ toasts, dismiss, timeScale }: VariantProps) {
  const reduce = useReducedMotion() ?? false;
  const preset = reduce
    ? fadePreset(timeScale)
    : {
        initial: { opacity: 0, y: 12, scale: 0.92 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, y: 12, scale: 0.92 },
        transition: {
          type: "spring" as const,
          duration: 0.34 * timeScale,
          bounce: 0.28,
        },
      };

  return (
    <DockStage>
      <AnimatePresence initial={false}>
        {toasts.map((toast) => (
          <motion.div key={toast.id} layout className={css.jobPill} {...preset}>
            {toast.progress !== undefined ? (
              <Ring toast={toast} />
            ) : (
              <ToneIcon tone={toast.tone} />
            )}
            <button
              type="button"
              className={css.jobMessage}
              onClick={() => dismiss(toast.id)}
            >
              {toast.message}
            </button>
            {toast.actionLabel ? (
              <button
                type="button"
                className={css.jobAction}
                onClick={() => dismiss(toast.id)}
              >
                {toast.actionLabel}
              </button>
            ) : null}
          </motion.div>
        ))}
      </AnimatePresence>
    </DockStage>
  );
}
