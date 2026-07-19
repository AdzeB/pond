import { useSelector } from "@tanstack/react-store";
import { Store } from "@tanstack/store";
import type { TargetAndTransition, Transition } from "motion/react";

/** Global time scale for the dock's motion (1 = real time); only the playground changes it, to slow transitions for inspection. */
const scaleStore = new Store({ factor: 1 });

export const motionScale = {
  set(factor: number): void {
    scaleStore.setState((s) => (s.factor === factor ? s : { factor }));
  },
};

export function useMotionScaleFactor(): number {
  return useSelector(scaleStore, (s) => s.factor);
}

export const gentleSpring: Transition = {
  type: "spring",
  duration: 0.22,
  bounce: 0.1,
};

export const snappySpring: Transition = {
  type: "spring",
  duration: 0.18,
  bounce: 0.12,
};

export const bouncySpring: Transition = {
  type: "spring",
  duration: 0.34,
  bounce: 0.28,
};

/** One shared easeOutQuart-style curve: the pill's box morph and the content crossfade ride the same curve so they land as one. */
const DOCK_EASE: [number, number, number, number] = [0.25, 1, 0.5, 1];
const FAMILY_CONTENT_DURATION = 0.4;

/** Directional route swaps ride the dock curve at content pace so tab changes fly instead of teleporting. */
export const routeSwapTransition: Transition = {
  duration: FAMILY_CONTENT_DURATION * 0.75,
  ease: DOCK_EASE,
};

export interface DockMotion {
  pillTransition: Transition;
  /** For size changes within one view (nav unfold, composer growth): quick, unlike the deliberate view morph. */
  quickTransition: Transition;
  swapTransition: Transition;
  swap: {
    initial: TargetAndTransition;
    animate: TargetAndTransition;
    exit: TargetAndTransition;
  };
}

/** `timeScale` stretches every duration so the box morph and the content swap stay in lockstep while slowed. */
export function buildDockMotion(
  reduceMotion: boolean,
  timeScale = 1,
): DockMotion {
  if (reduceMotion) {
    return {
      pillTransition: { duration: 0 },
      quickTransition: { duration: 0 },
      swapTransition: { duration: 0 },
      swap: {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
      },
    };
  }
  const contentDuration = FAMILY_CONTENT_DURATION * timeScale;
  const enterTransition: Transition = {
    duration: contentDuration * 0.75,
    delay: contentDuration * 0.25,
    ease: DOCK_EASE,
  };
  return {
    pillTransition: {
      duration: 0.4 * timeScale,
      ease: DOCK_EASE,
    },
    quickTransition: {
      type: "spring",
      duration: 0.22 * timeScale,
      bounce: 0.1,
    },
    swapTransition: enterTransition,
    swap: {
      initial: { opacity: 0, filter: "blur(8px)" },
      animate: {
        opacity: 1,
        transition: enterTransition,
        filter: "blur(0px)",
      },
      exit: {
        opacity: 0,
        pointerEvents: "none",
        filter: "blur(8px)",
        position: "absolute",
        bottom: [0, 0],
        left: ["50%", "50%"],
        x: ["-50%", "-50%"],
        transition: { duration: contentDuration, ease: DOCK_EASE },
      },
    },
  };
}
