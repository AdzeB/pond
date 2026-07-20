import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { PlaygroundToast, VariantProps } from "./lib/engine";
import { fadePreset, MockDock, ToneIcon } from "./lib/parts";
import css from "./variants.module.css";

function toneTitle(toast: PlaygroundToast): string {
  if (toast.tone === "error") return "Something failed";
  if (toast.tone === "success") return "Done";
  return "Pond";
}

/** Top-right cards in the Notification Center register: leading glyph, app-style header, newest on top. */
export function VariantCornerNative({
  toasts,
  dismiss,
  timeScale,
}: VariantProps) {
  const reduce = useReducedMotion() ?? false;
  const preset = reduce
    ? fadePreset(timeScale)
    : {
        initial: { opacity: 0, x: 56 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: 56 },
        transition: {
          type: "spring" as const,
          duration: 0.42 * timeScale,
          bounce: 0.14,
        },
      };

  const newestFirst = [...toasts].reverse();

  return (
    <>
      <div className={css.corner}>
        <AnimatePresence initial={false}>
          {newestFirst.map((toast) => (
            <motion.div
              key={toast.id}
              layout
              className={css.notice}
              {...preset}
            >
              <span className={css.noticeGlyph}>
                <ToneIcon tone={toast.tone} />
              </span>
              <button
                type="button"
                className={css.noticeText}
                onClick={() => dismiss(toast.id)}
              >
                <span className={css.noticeApp}>{toneTitle(toast)}</span>
                <span className={css.noticeMessage}>{toast.message}</span>
              </button>
              {toast.actionLabel ? (
                <button
                  type="button"
                  className={css.noticeAction}
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
