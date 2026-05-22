import type { Transition } from "motion/react";

// Used by `motion.li layout` on grid items: when sidebar/inspector
// visibility flips, content area resizes in one frame and FLIP
// interpolates each card from its old to new bounding box via composited
// transforms (no per-frame layout).
//
// Linear-leaning durations: 220ms keeps the transition under the 250ms
// cause-and-effect threshold (Material defaults to 200ms, iOS spring to
// ~350ms). Lower bounce makes cards land instead of jiggle.
export const drawerSpring: Transition = {
  type: "spring",
  duration: 0.22,
  bounce: 0.1,
};
