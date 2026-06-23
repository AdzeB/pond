import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { gentleSpring } from "@/lib/motion";
import { dismissToast, useToasts } from "@/stores/toasts";
import styles from "./styles.module.css";

// Transient task/status notifications, stacked top-center above all content.
// Click a toast to dismiss it early.
export function Toaster() {
  const toasts = useToasts();
  const reduceMotion = useReducedMotion();

  const variants = reduceMotion
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
      }
    : {
        initial: { opacity: 0, y: -12, scale: 0.96 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, y: -8, scale: 0.97 },
      };

  return (
    <div className={styles.viewport} aria-live="polite">
      <AnimatePresence initial={false}>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            layout
            className={styles.toast}
            data-tone={toast.tone}
            {...variants}
            transition={gentleSpring}
          >
            <button
              type="button"
              className={styles.message}
              onClick={() => dismissToast(toast.id)}
            >
              {toast.message}
            </button>
            {toast.action ? (
              <button
                type="button"
                className={styles.action}
                onClick={() => {
                  toast.action?.onAction();
                  dismissToast(toast.id);
                }}
              >
                {toast.action.label}
              </button>
            ) : null}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
