import {
  IconChartFill18 as Analytics,
  IconSparkle3Fill18 as Ask,
  IconCircleCheckFill18 as CheckCircle,
  IconCircleInfoFill18 as InfoCircle,
  IconArchiveContent2Fill18 as Library,
  IconArchivePlusFill18 as New,
  IconUploadFill18 as Saves,
  IconGlobeFill18 as Sources,
  IconTriangleWarningFill18 as Warning,
} from "@pond/icons/fill/18";
import { IconMagnifierOutline18 as Search } from "@pond/icons/outline/18";
import { Tray } from "@pond/ui";
import type { TargetAndTransition, Transition } from "motion/react";
import { motion } from "motion/react";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import css from "../variants.module.css";
import type { Tone } from "./engine";

/** Static stand-ins (dock pill, tone glyphs, motion presets) so variants stay pure layout, decoupled from router and stores. */

export const toastEase: [number, number, number, number] = [0.25, 1, 0.5, 1];

export interface PresencePreset {
  initial: TargetAndTransition;
  animate: TargetAndTransition;
  exit: TargetAndTransition;
  transition: Transition;
}

/** Reduced-motion alternative shared by every variant: a plain crossfade. */
export function fadePreset(timeScale: number): PresencePreset {
  return {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.15 * timeScale, ease: toastEase },
  };
}

export function ToneIcon({ tone }: { tone: Tone }) {
  const Icon =
    tone === "success" ? CheckCircle : tone === "error" ? Warning : InfoCircle;
  return (
    <span className={css.toneIcon} data-tone={tone} aria-hidden>
      <Icon width={16} height={16} />
    </span>
  );
}

/** Long messages split at the first sentence boundary so card variants can carry a title and body. */
export function splitMessage(message: string): {
  title: string;
  body?: string;
} {
  const index = message.indexOf(". ");
  if (index === -1) return { title: message.replace(/\.$/, "") };
  return { title: message.slice(0, index), body: message.slice(index + 2) };
}

export function MockDockRow() {
  return (
    <>
      <Tray.Item aria-label="Library" data-status="active">
        <Tray.Indicator />
        <Library />
      </Tray.Item>
      <Tray.Item aria-label="Sources">
        <Sources />
      </Tray.Item>
      <Tray.Item aria-label="Analytics">
        <Analytics />
      </Tray.Item>
      <Tray.Item aria-label="Saves">
        <Saves />
      </Tray.Item>
      <Tray.Separator />
      <Tray.Item aria-label="New save">
        <New />
      </Tray.Item>
      <Tray.Item aria-label="Search">
        <Search />
      </Tray.Item>
      <Tray.Item aria-label="Ask AI">
        <Ask />
      </Tray.Item>
    </>
  );
}

export function MockDock() {
  return (
    <Tray.Pill className={css.dockPill}>
      <MockDockRow />
    </Tray.Pill>
  );
}

/** Bottom-center scaffold shared by the dock-anchored variants: toasts stack in the slot directly above the mock pill. */
export function DockStage({ children }: { children: ReactNode }) {
  return (
    <div className={css.dockArea}>
      <div className={css.stack}>{children}</div>
      <MockDock />
    </div>
  );
}

/** Miniature of the real dock's size morph: content is measured and the capsule animates to fit. */
export function MeasuredPill({
  transition,
  children,
}: {
  transition: Transition;
  children: ReactNode;
}) {
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
          transition={isFirstMeasure ? { duration: 0 } : transition}
        />
      }
    >
      <div ref={viewportRef} className={css.morphViewport}>
        {children}
      </div>
    </Tray.Pill>
  );
}
