import { IconXmarkOutline12 } from "@pond/icons/outline/12";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { VariantProps } from "./lib/engine";
import {
  DockStage,
  fadePreset,
  splitMessage,
  ToneIcon,
  toastEase,
} from "./lib/parts";
import css from "./variants.module.css";

/** A slightly larger card that splits long messages into title and body, entering with the dock's blur crossfade. */
export function VariantInsetCard({ toasts, dismiss, timeScale }: VariantProps) {
  const reduce = useReducedMotion() ?? false;
  const preset = reduce
    ? fadePreset(timeScale)
    : {
        initial: { opacity: 0, y: 14, filter: "blur(8px)" },
        animate: { opacity: 1, y: 0, filter: "blur(0px)" },
        exit: { opacity: 0, y: 8, filter: "blur(8px)" },
        transition: { duration: 0.3 * timeScale, ease: toastEase },
      };

  return (
    <DockStage>
      <AnimatePresence initial={false}>
        {toasts.map((toast) => {
          const { title, body } = splitMessage(toast.message);
          return (
            <motion.div key={toast.id} layout className={css.card} {...preset}>
              <div className={css.cardHead}>
                <ToneIcon tone={toast.tone} />
                <span className={css.cardTitle}>{title}</span>
                <button
                  type="button"
                  aria-label="Dismiss"
                  className={css.cardClose}
                  onClick={() => dismiss(toast.id)}
                >
                  <IconXmarkOutline12 strokeWidth={2} />
                </button>
              </div>
              {body ? <p className={css.cardBody}>{body}</p> : null}
              {toast.actionLabel ? (
                <div className={css.cardActions}>
                  <button
                    type="button"
                    className={css.cardAction}
                    onClick={() => dismiss(toast.id)}
                  >
                    {toast.actionLabel}
                  </button>
                </div>
              ) : null}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </DockStage>
  );
}
