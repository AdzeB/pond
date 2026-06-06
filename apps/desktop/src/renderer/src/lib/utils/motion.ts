import type { Transition } from "motion/react";

// FLIP-only transition for grid items (`motion.li layout="position"`):
// position + opacity animate via transform, size deltas snap.
export const drawerSpring: Transition = {
  type: "spring",
  duration: 0.22,
  bounce: 0.1,
};
