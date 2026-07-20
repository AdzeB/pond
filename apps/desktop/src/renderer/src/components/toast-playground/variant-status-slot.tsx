import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { VariantProps } from "./lib/engine";
import { fadePreset, MockDock, ToneIcon, toastEase } from "./lib/parts";
import css from "./variants.module.css";

/** One slot above the dock, one message at a time: new feedback replaces the line instead of stacking, with a badge for what waits behind it. */
export function VariantStatusSlot({
  toasts,
  dismiss,
  timeScale,
}: VariantProps) {
  const reduce = useReducedMotion() ?? false;
  const active = toasts.at(-1) ?? null;
  const queued = toasts.length - 1;

  const preset = reduce
    ? fadePreset(timeScale)
    : {
        initial: { opacity: 0, y: 10 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -6 },
        transition: { duration: 0.24 * timeScale, ease: toastEase },
      };

  return (
    <div className={css.dockArea}>
      <div className={css.stack}>
        <AnimatePresence initial={false} mode="popLayout">
          {active ? (
            <motion.div key={active.id} className={css.slotPill} {...preset}>
              <ToneIcon tone={active.tone} />
              <button
                type="button"
                className={css.slotMessage}
                onClick={() => dismiss(active.id)}
              >
                {active.message}
              </button>
              {active.actionLabel ? (
                <button
                  type="button"
                  className={css.capsuleAction}
                  onClick={() => dismiss(active.id)}
                >
                  {active.actionLabel}
                </button>
              ) : null}
              {queued > 0 ? (
                <span className={css.slotQueue}>+{queued}</span>
              ) : null}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
      <MockDock />
    </div>
  );
}
