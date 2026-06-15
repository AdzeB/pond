import {
  AnimatePresence,
  MotionConfig,
  motion,
  useReducedMotion,
} from "motion/react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { getSourceIcon } from "@/lib/sources-registry";
import "./hud.css";
import styles from "./hud.module.css";

interface SaveHudPayload {
  id: string;
  source: string;
  avatarUrl?: string | null;
  // True when the main process attached a native NSGlassEffectView behind the
  // window: the pill then becomes a thin tint over real glass and skips the CSS
  // drop shadow / slide (the window hugs the pill, leaving no room to slide).
  nativeGlass?: boolean;
}

interface HudItem extends SaveHudPayload {
  time: string;
}

const DISMISS_MS = 6000;

function formatTime(date: Date): string {
  const month = date.toLocaleString("en-US", { month: "short" });
  const day = date.getDate();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const isPm = date.getHours() >= 12;
  const hour = date.getHours() % 12 || 12;
  return `${month} ${day} ${hour}:${minutes}${isPm ? "PM" : "AM"}`;
}

function SaveHudCard({ item, onView }: { item: HudItem; onView: () => void }) {
  const SourceIcon = getSourceIcon(item.source);
  return (
    <div
      className={styles.pill}
      data-native-glass={item.nativeGlass ? "true" : undefined}
    >
      <div className={styles.left}>
        <span className={styles.avatars}>
          <span className={styles.sourceBadge} aria-hidden>
            {SourceIcon ? <SourceIcon width={16} height={16} /> : null}
          </span>
          {item.avatarUrl ? (
            <span className={styles.avatar}>
              <img
                className={styles.avatarImg}
                src={item.avatarUrl}
                alt=""
                draggable={false}
              />
            </span>
          ) : null}
        </span>
        <span className={styles.text}>
          <span className={styles.title}>New Save</span>
          <span className={styles.time}>{item.time}</span>
        </span>
      </div>
      <button type="button" className={styles.view} onClick={onView}>
        View in Pond
      </button>
    </div>
  );
}

function Hud() {
  const [item, setItem] = useState<HudItem | null>(null);
  const timer = useRef<number | null>(null);
  const observer = useRef<ResizeObserver | null>(null);
  const reduceMotion = useReducedMotion();

  const scheduleDismiss = useCallback(() => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setItem(null), DISMISS_MS);
  }, []);

  const pauseDismiss = useCallback(() => {
    if (timer.current) window.clearTimeout(timer.current);
  }, []);

  useEffect(() => {
    const off = window.pond.onSaveHud((raw) => {
      const payload = raw as SaveHudPayload;
      setItem({ ...payload, time: formatTime(new Date()) });
      scheduleDismiss();
    });
    // Tell main the listener is attached so any buffered saves can flush.
    window.pond.saveHudReady();
    return () => {
      off();
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [scheduleDismiss]);

  // Measure the card and report width+height so main can size and center the
  // transparent window exactly around it (no empty click-trap, correct bounds).
  // Uses offsetWidth/Height (layout box) so hover/enter transforms don't feed
  // back into window resizes.
  const measureRef = useCallback((el: HTMLDivElement | null) => {
    observer.current?.disconnect();
    if (!el) return;
    const report = () => {
      if (el.offsetWidth > 1 && el.offsetHeight > 1) {
        window.pond.resizeSaveHud(el.offsetWidth, el.offsetHeight);
      }
    };
    report();
    const ro = new ResizeObserver(report);
    ro.observe(el);
    observer.current = ro;
  }, []);

  // The native-glass window hugs the pill exactly, so a slide-up would clip;
  // fall back to a pure scale/fade there. The CSS path has padding to slide in.
  const native = item?.nativeGlass ?? false;
  const enterY = native ? 0 : 12;
  const motionProps = reduceMotion
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.12 },
      }
    : {
        initial: { opacity: 0, y: enterY, scale: 0.92, filter: "blur(4px)" },
        animate: { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" },
        exit: {
          opacity: 0,
          scale: 0.96,
          filter: "blur(2px)",
          transition: { duration: 0.18, ease: "easeIn" as const },
        },
        transition: {
          type: "spring" as const,
          stiffness: 320,
          damping: 26,
          mass: 0.9,
        },
      };

  return (
    <MotionConfig reducedMotion="user">
      <AnimatePresence onExitComplete={() => window.pond.resizeSaveHud(0, 0)}>
        {item ? (
          <motion.div
            key="hud-card"
            ref={measureRef}
            className={styles.stage}
            onMouseEnter={pauseDismiss}
            onMouseLeave={scheduleDismiss}
            {...motionProps}
          >
            <SaveHudCard
              item={item}
              onView={() => window.pond.activateSaveHud(item.id)}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </MotionConfig>
  );
}

const root = document.getElementById("root");
if (!root) throw new Error("#root element missing");

createRoot(root).render(
  <React.StrictMode>
    <Hud />
  </React.StrictMode>,
);
