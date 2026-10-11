import { LOGO_PATH, LOGO_VIEW_BOX } from "@pond/ui";
import { useEffect, useRef } from "react";
import {
  easeInOutCubic,
  MARK_CENTER,
  RING_RADIUS,
  RING_THICKNESS,
  ringMorphPath,
} from "./ring-morph";
import styles from "./styles.module.css";

const MORPH_SECONDS = 0.35;
const TRACK_OPACITY = 0.16;
const RING_DASH = 100;
const SPIN_DASH = 30;
const MARK_PHASE = 0;
const RING_PHASE = 1;
const SPINNER_PHASE = 2;

interface MarkParts {
  root: HTMLSpanElement;
  morph: SVGPathElement;
  track: SVGCircleElement;
  arc: SVGCircleElement;
}

function prefersStillMotion(): boolean {
  return document.documentElement.getAttribute("data-reduce-motion") === "true";
}

function currentDash(arc: SVGCircleElement): number {
  const dash = Number.parseFloat(getComputedStyle(arc).strokeDasharray);
  return Number.isFinite(dash) ? dash : SPIN_DASH;
}

function paint(
  parts: MarkParts,
  phase: number,
  active: boolean,
  closingDash: number,
): void {
  parts.root.toggleAttribute("data-spinning", phase > RING_PHASE);
  parts.root.toggleAttribute(
    "data-breathing",
    active && phase === SPINNER_PHASE,
  );
  if (phase < RING_PHASE) {
    const mark = 1 - easeInOutCubic(phase);
    parts.morph.setAttribute("d", mark === 1 ? LOGO_PATH : ringMorphPath(mark));
    parts.morph.setAttribute("visibility", "visible");
    parts.arc.setAttribute("visibility", "hidden");
    parts.track.setAttribute("opacity", "0");
    return;
  }
  const open = easeInOutCubic(phase - RING_PHASE);
  const spinDash = active ? SPIN_DASH : closingDash;
  const dash = RING_DASH + (spinDash - RING_DASH) * open;
  parts.morph.setAttribute("visibility", "hidden");
  parts.arc.setAttribute("visibility", "visible");
  parts.arc.setAttribute("stroke-dasharray", `${dash.toFixed(2)} 100`);
  parts.track.setAttribute("opacity", (TRACK_OPACITY * open).toFixed(3));
}

/** The Pond mark, which morphs into a ring and then a spinning arc while `active`. */
export function HarvesterMark({ active }: { active: boolean }) {
  const root = useRef<HTMLSpanElement>(null);
  const morph = useRef<SVGPathElement>(null);
  const track = useRef<SVGCircleElement>(null);
  const arc = useRef<SVGCircleElement>(null);
  const motion = useRef({ phase: MARK_PHASE, closingDash: SPIN_DASH });

  useEffect(() => {
    const parts =
      root.current && morph.current && track.current && arc.current
        ? {
            root: root.current,
            morph: morph.current,
            track: track.current,
            arc: arc.current,
          }
        : null;
    if (!parts) return;
    const state = motion.current;
    const target = active ? SPINNER_PHASE : MARK_PHASE;
    if (!active && state.phase === SPINNER_PHASE) {
      state.closingDash = currentDash(parts.arc);
    }
    let last = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      const seconds = Math.min(0.05, (now - last) / 1000);
      last = now;
      const step = prefersStillMotion()
        ? SPINNER_PHASE
        : seconds / MORPH_SECONDS;
      state.phase = active
        ? Math.min(SPINNER_PHASE, state.phase + step)
        : Math.max(MARK_PHASE, state.phase - step);
      paint(parts, state.phase, active, state.closingDash);
      if (state.phase !== target) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active]);

  return (
    <span ref={root} className={styles.mark}>
      <svg
        viewBox={`0 0 ${LOGO_VIEW_BOX} ${LOGO_VIEW_BOX}`}
        fill="none"
        aria-hidden="true"
      >
        <circle
          ref={track}
          cx={MARK_CENTER}
          cy={MARK_CENTER}
          r={RING_RADIUS}
          stroke="currentColor"
          strokeWidth={RING_THICKNESS}
          opacity={0}
        />
        <path
          ref={morph}
          d={LOGO_PATH}
          fill="currentColor"
          fillRule="evenodd"
        />
        <circle
          ref={arc}
          className={styles.arc}
          cx={MARK_CENTER}
          cy={MARK_CENTER}
          r={RING_RADIUS}
          stroke="currentColor"
          strokeWidth={RING_THICKNESS}
          strokeLinecap="round"
          pathLength={100}
          transform={`rotate(-90 ${MARK_CENTER} ${MARK_CENTER})`}
          visibility="hidden"
        />
      </svg>
    </span>
  );
}
