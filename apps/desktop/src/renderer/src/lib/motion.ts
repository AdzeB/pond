import type { Transition, Variants } from "motion/react";

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

// Playful overshoot for emphasis/delight moments. Use sparingly.
export const overshootSpring: Transition = {
  type: "spring",
  duration: 0.42,
  bounce: 0.32,
};

// Elastic settle for selections/toggles that should "land" with a little
// bounce rather than slide flat — the Aave "the selection springs into place"
// feel. Lower bounce than `overshootSpring` since it fires on every switch.
export const bouncySpring: Transition = {
  type: "spring",
  duration: 0.34,
  bounce: 0.28,
};

// Default for `layout` animations on persistent elements that reflow.
export const layoutTransition: Transition = gentleSpring;

// FLIP-only transition for grid items: position/opacity animate via transform,
// size deltas snap. Kept as an alias for back-compat with existing call sites.
export const drawerSpring: Transition = gentleSpring;

export type Direction = "forward" | "backward";

// Directional enter/exit for content that travels in the direction of the
// action (next = forward/right, prev = backward/left). "We fly instead of
// teleport." Pair with `<AnimatePresence custom={direction} mode="popLayout">`.
const DIRECTIONAL_OFFSET = 16;

export const directionalVariants: Variants = {
  enter: (direction: Direction) => ({
    opacity: 0,
    x: direction === "forward" ? DIRECTIONAL_OFFSET : -DIRECTIONAL_OFFSET,
  }),
  center: { opacity: 1, x: 0 },
  exit: (direction: Direction) => ({
    opacity: 0,
    x: direction === "forward" ? -DIRECTIONAL_OFFSET : DIRECTIONAL_OFFSET,
  }),
};
