import { IconXmarkOutline12 } from "@pond/icons/outline/12";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useMemo } from "react";
import { buildDockMotion } from "@/lib/ui/motion";
import type { VariantProps } from "./lib/engine";
import { MeasuredPill, MockDockRow, ToneIcon } from "./lib/parts";
import css from "./variants.module.css";

/** No second surface: the dock pill itself becomes the message with the real dock's box-and-crossfade, then morphs back. */
export function VariantDockMorph({ toasts, dismiss, timeScale }: VariantProps) {
  const reduce = useReducedMotion() ?? false;
  const dockMotion = useMemo(
    () => buildDockMotion(reduce, timeScale),
    [reduce, timeScale],
  );
  const active = toasts.at(-1) ?? null;

  return (
    <div className={css.dockArea}>
      <MeasuredPill transition={dockMotion.pillTransition}>
        <AnimatePresence initial={false}>
          {active ? (
            <motion.div
              key={`toast-${active.id}`}
              className={css.morphToast}
              {...dockMotion.swap}
              transition={dockMotion.swapTransition}
            >
              <ToneIcon tone={active.tone} />
              <span className={css.morphMessage}>{active.message}</span>
              {active.actionLabel ? (
                <button
                  type="button"
                  className={css.morphAction}
                  onClick={() => dismiss(active.id)}
                >
                  {active.actionLabel}
                </button>
              ) : null}
              <button
                type="button"
                aria-label="Dismiss"
                className={css.morphDismiss}
                onClick={() => dismiss(active.id)}
              >
                <IconXmarkOutline12 strokeWidth={2} />
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="nav"
              className={css.morphRow}
              {...dockMotion.swap}
              transition={dockMotion.swapTransition}
            >
              <MockDockRow />
            </motion.div>
          )}
        </AnimatePresence>
      </MeasuredPill>
    </div>
  );
}
