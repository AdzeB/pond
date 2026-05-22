import type { Transition } from "motion/react";

// Used by `motion.li layout` on grid items: when sidebar/inspector
// visibility flips, content area resizes in one frame and FLIP
// interpolates each card from its old to new bounding box via composited
// transforms (no per-frame layout).
export const drawerSpring: Transition = {
  type: "spring",
  duration: 0.4,
  bounce: 0.15,
};
