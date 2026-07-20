import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { VariantProps } from "./lib/engine";
import { fadePreset, MockDock, toastEase } from "./lib/parts";
import css from "./variants.module.css";

/** A dense, log-like feed in the bottom corner: ambient history rather than interruption. */
export function VariantBottomLeft({
  toasts,
  dismiss,
  timeScale,
}: VariantProps) {
  const reduce = useReducedMotion() ?? false;
  const preset = reduce
    ? fadePreset(timeScale)
    : {
        initial: { opacity: 0, y: 10 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: 6 },
        transition: { duration: 0.18 * timeScale, ease: toastEase },
      };

  return (
    <>
      <div className={css.log}>
        <AnimatePresence initial={false}>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              layout
              className={css.logRow}
              {...preset}
            >
              <span className={css.logDot} data-tone={toast.tone} aria-hidden />
              <button
                type="button"
                className={css.logMessage}
                onClick={() => dismiss(toast.id)}
              >
                {toast.message}
              </button>
              {toast.actionLabel ? (
                <button
                  type="button"
                  className={css.logAction}
                  onClick={() => dismiss(toast.id)}
                >
                  {toast.actionLabel}
                </button>
              ) : null}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      <div className={css.dockArea}>
        <MockDock />
      </div>
    </>
  );
}
