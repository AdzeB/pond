import type { TargetAndTransition, Transition } from "motion/react";

export const standardEase = [0.2, 0, 0, 1] as const;

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

const DOCK_EASE: [number, number, number, number] = [0.25, 1, 0.5, 1];
const FAMILY_CONTENT_DURATION = 0.4;

export interface DockMotion {
  pillTransition: Transition;
  quickTransition: Transition;
  swapTransition: Transition;
  swap: {
    initial: TargetAndTransition;
    animate: TargetAndTransition;
    exit: TargetAndTransition;
  };
}

export function buildDockMotion(reduceMotion: boolean): DockMotion {
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
  const contentDuration = FAMILY_CONTENT_DURATION;
  const enterTransition: Transition = {
    duration: contentDuration * 0.75,
    delay: contentDuration * 0.25,
    ease: DOCK_EASE,
  };
  return {
    pillTransition: {
      duration: 0.4,
      ease: DOCK_EASE,
    },
    quickTransition: {
      type: "spring",
      duration: 0.22,
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
        transition: { duration: contentDuration, ease: DOCK_EASE },
      },
    },
  };
}
