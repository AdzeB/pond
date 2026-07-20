import { Tray } from "@pond/ui";
import { motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { buildDockMotion } from "@/lib/ui/motion";
import styles from "../variants.module.css";

/** The production dock's motion set at full speed, shared so prototype morphs read like the real pill. */
export const dockMotion = buildDockMotion(false);

/** Miniature of the real dock's size morph: content is measured and the capsule springs to fit. */
export function MorphPill({ children }: { children: React.ReactNode }) {
  const [bounds, setBounds] = useState<{
    width: number;
    height: number;
  } | null>(null);

  /** The first measurement applies instantly because the pill starts at 0x0; only later changes animate. */
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

  return (
    <Tray.Pill
      render={
        <motion.div
          initial={false}
          animate={bounds ? { width: bounds.width, height: bounds.height } : {}}
          transition={
            isFirstMeasure ? { duration: 0 } : dockMotion.pillTransition
          }
        />
      }
    >
      <div ref={viewportRef} className={styles["morph-viewport"]}>
        {children}
      </div>
    </Tray.Pill>
  );
}
