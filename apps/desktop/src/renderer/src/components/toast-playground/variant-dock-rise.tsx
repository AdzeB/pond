import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { VariantProps } from "./lib/engine";
import { DockStage, fadePreset } from "./lib/parts";
import css from "./variants.module.css";

/** Today's toast content relocated to the dock's anchor: pills rise from behind the pill and stack upward. */
export function VariantDockRise({ toasts, dismiss, timeScale }: VariantProps) {
  const reduce = useReducedMotion() ?? false;
  const preset = reduce
    ? fadePreset(timeScale)
    : {
        initial: { opacity: 0, y: 28, scale: 0.9 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, y: 12, scale: 0.92 },
        transition: {
          type: "spring" as const,
          duration: 0.4 * timeScale,
          bounce: 0.16,
        },
      };

  return (
    <DockStage>
      <AnimatePresence initial={false}>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            layout
            className={css.risePill}
            {...preset}
          >
            <button
              type="button"
              className={css.riseBody}
              onClick={() => dismiss(toast.id)}
            >
              {toast.message}
            </button>
            {toast.actionLabel ? (
              <button
                type="button"
                className={css.riseAction}
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
