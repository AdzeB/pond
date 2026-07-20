import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { PlaygroundToast, VariantProps } from "./lib/engine";
import { fadePreset, MockDock, ToneIcon } from "./lib/parts";
import css from "./variants.module.css";

/** Dynamic-island register: a single dark surface that morphs to fit whatever it is saying; queued toasts split off into a counter lobe. */
export function VariantIsland({ toasts, dismiss, timeScale }: VariantProps) {
  const reduce = useReducedMotion() ?? false;
  const active = toasts.at(-1);
  const queued = Math.max(0, toasts.length - 1);

  const spring = {
    type: "spring" as const,
    duration: 0.55 * timeScale,
    bounce: reduce ? 0 : 0.32,
  };

  const surfacePreset = reduce
    ? fadePreset(timeScale)
    : {
        initial: { opacity: 0, scale: 0.4, y: 14 },
        animate: { opacity: 1, scale: 1, y: 0 },
        exit: { opacity: 0, scale: 0.4, y: 14 },
        transition: spring,
      };

  const lobePreset = reduce
    ? fadePreset(timeScale)
    : {
        initial: { opacity: 0, scale: 0.3, x: -18 },
        animate: { opacity: 1, scale: 1, x: 0 },
        exit: { opacity: 0, scale: 0.3, x: -18 },
        transition: spring,
      };

  return (
    <div className={css.dockArea}>
      <div className={css.islandSlot}>
        <AnimatePresence initial={false}>
          {active ? (
            <motion.div
              key="island"
              className={css.islandRow}
              style={{ originY: 1 }}
              {...surfacePreset}
            >
              <Island
                toast={active}
                dismiss={dismiss}
                timeScale={timeScale}
                reduce={reduce}
              />
              <AnimatePresence initial={false}>
                {queued > 0 ? (
                  <motion.div
                    key="lobe"
                    className={css.islandLobe}
                    {...lobePreset}
                  >
                    +{queued}
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
      <MockDock />
    </div>
  );
}

/** The island animates to the measured size of its content, mirroring the real dock's morph. */
function Island({
  toast,
  dismiss,
  timeScale,
  reduce,
}: {
  toast: PlaygroundToast;
  dismiss: (id: number) => void;
  timeScale: number;
  reduce: boolean;
}) {
  const [bounds, setBounds] = useState<{
    width: number;
    height: number;
  } | null>(null);

  /** The first measurement applies instantly because the island starts at 0x0; only later changes animate. */
  const hasMeasured = useRef(false);
  const isFirstMeasure = bounds !== null && !hasMeasured.current;
  useEffect(() => {
    if (bounds) hasMeasured.current = true;
  }, [bounds]);

  const observer = useRef<ResizeObserver | null>(null);
  const viewportRef = useCallback((el: HTMLDivElement | null) => {
    observer.current?.disconnect();
    observer.current = null;
    if (!el) return;
    const measure = () =>
      setBounds({ width: el.offsetWidth, height: el.offsetHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    observer.current = ro;
  }, []);

  const morph = {
    type: "spring" as const,
    duration: 0.55 * timeScale,
    bounce: reduce ? 0 : 0.26,
  };

  const swapPreset = reduce
    ? fadePreset(timeScale)
    : {
        initial: { opacity: 0, scale: 0.86, filter: "blur(6px)" },
        animate: { opacity: 1, scale: 1, filter: "blur(0px)" },
        exit: { opacity: 0, scale: 0.86, filter: "blur(6px)" },
        transition: {
          type: "spring" as const,
          duration: 0.45 * timeScale,
          bounce: 0,
        },
      };

  return (
    <motion.div
      className={css.island}
      initial={false}
      animate={bounds ? { width: bounds.width, height: bounds.height } : {}}
      transition={isFirstMeasure ? { duration: 0 } : morph}
    >
      <div ref={viewportRef} className={css.islandViewport}>
        <AnimatePresence initial={false} mode="popLayout">
          <motion.div
            key={toast.id}
            className={css.islandContent}
            {...swapPreset}
          >
            {toast.progress !== undefined && !toast.done ? (
              <IslandRing progress={toast.progress} />
            ) : (
              <ToneIcon tone={toast.tone} />
            )}
            <button
              type="button"
              className={css.islandMessage}
              onClick={() => dismiss(toast.id)}
            >
              {toast.message}
            </button>
            {toast.actionLabel ? (
              <button
                type="button"
                className={css.islandAction}
                onClick={() => dismiss(toast.id)}
              >
                {toast.actionLabel}
              </button>
            ) : null}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

const RING_RADIUS = 7;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

function IslandRing({ progress }: { progress: number }) {
  return (
    <span className={css.islandRing} aria-hidden>
      <svg
        aria-hidden="true"
        width="18"
        height="18"
        viewBox="0 0 18 18"
        fill="none"
      >
        <circle
          className={css.islandRingTrack}
          cx="9"
          cy="9"
          r={RING_RADIUS}
          strokeWidth="2"
        />
        <circle
          className={css.islandRingFill}
          cx="9"
          cy="9"
          r={RING_RADIUS}
          strokeWidth="2"
          strokeDasharray={RING_LENGTH}
          strokeDashoffset={RING_LENGTH * (1 - progress)}
        />
      </svg>
    </span>
  );
}
