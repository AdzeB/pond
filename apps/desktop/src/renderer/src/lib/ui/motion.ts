import type { TargetAndTransition, Transition } from "motion/react";

// Shared motion vocabulary. Mirrors the `--ds-duration-*` / `--ds-easing-*`
// tokens in CSS so JS-driven motion (motion/react) and CSS transitions feel
// like one system. See PRINCIPLES.md.

// Quiet, low-bounce spring for everyday layout/position changes.
export const gentleSpring: Transition = {
  type: "spring",
  duration: 0.22,
  bounce: 0.1,
};

// Quicker spring for small, responsive UI (badges, dots, controls).
export const snappySpring: Transition = {
  type: "spring",
  duration: 0.18,
  bounce: 0.12,
};

// Elastic settle for selections/toggles that should "land" with a little
// bounce rather than slide flat — the Aave "the selection springs into place"
// feel. Kept moderate since it fires on every switch.
export const bouncySpring: Transition = {
  type: "spring",
  duration: 0.34,
  bounce: 0.28,
};

// --- Family (connectkit) content crossfade -----------------------------------
// Ported verbatim from connectkit's `contentVariants`
// (family/connectkit · Common/Modal/index.tsx):
//   - incoming fades in over 75% of the duration, delayed by 25% so the box
//     morph leads and the content lands into the settled size.
//   - outgoing is popped out of flow (position: absolute) and pinned centered
//     (left 50% / x -50% as no-op keyframes so it fades without sliding), then
//     fades over the full duration.
// The box size morph itself is a CSS transition on the pill (see `.pill` in
// styles.module.css: `width/height 200ms cubic-bezier(0.25, 0.1, 0.25, 1)`),
// matching connectkit's `--transition: height/width 200ms var(--ease)` rather
// than a JS spring.
const FAMILY_EASE: [number, number, number, number] = [0.26, 0.08, 0.25, 1];
const FAMILY_CONTENT_DURATION = 0.22;

interface DockMotion {
  pillTransition: Transition;
  swapTransition: Transition;
  swap: {
    initial: TargetAndTransition;
    animate: TargetAndTransition;
    exit: TargetAndTransition;
  };
}

// Resolve reduced-motion into the concrete content-swap variants the dock
// consumes; the box size morph itself is a CSS transition on the pill.
export function buildDockMotion(reduceMotion: boolean): DockMotion {
  if (reduceMotion) {
    return {
      pillTransition: { duration: 0 },
      swapTransition: { duration: 0 },
      swap: {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
      },
    };
  }
  const enterTransition: Transition = {
    duration: FAMILY_CONTENT_DURATION * 0.75,
    delay: FAMILY_CONTENT_DURATION * 0.25,
    ease: FAMILY_EASE,
  };
  return {
    // Kept only for context back-compat; the box morph is CSS, not JS.
    pillTransition: { duration: 0.2, ease: FAMILY_EASE },
    swapTransition: enterTransition,
    swap: {
      initial: { opacity: 0 },
      animate: { opacity: 1, transition: enterTransition },
      exit: {
        opacity: 0,
        pointerEvents: "none",
        position: "absolute",
        left: ["50%", "50%"],
        x: ["-50%", "-50%"],
        transition: { duration: FAMILY_CONTENT_DURATION, ease: FAMILY_EASE },
      },
    },
  };
}
