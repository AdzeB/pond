import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { VariantProps } from "./lib/engine";
import { DockStage, fadePreset, ToneIcon } from "./lib/parts";
import css from "./variants.module.css";

/** Finish pass on the rise placement: tone icon, tighter type, ghost undo, springier entrance. */
export function VariantCapsule({ toasts, dismiss, timeScale }: VariantProps) {
  const reduce = useReducedMotion() ?? false;
  const preset = reduce
    ? fadePreset(timeScale)
    : {
        initial: { opacity: 0, y: 24, scale: 0.88 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, y: 10, scale: 0.92 },
        transition: {
          type: "spring" as const,
          duration: 0.34 * timeScale,
          bounce: 0.26,
        },
      };

  return (
    <DockStage>
      <AnimatePresence initial={false}>
        {toasts.map((toast) => (
          <motion.div key={toast.id} layout className={css.capsule} {...preset}>
            <ToneIcon tone={toast.tone} />
            <button
              type="button"
              className={css.capsuleMessage}
              onClick={() => dismiss(toast.id)}
            >
              {toast.message}
            </button>
            {toast.actionLabel ? (
              <button
                type="button"
                className={css.capsuleAction}
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
