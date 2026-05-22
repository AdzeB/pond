import type { Transition } from "motion/react";

// Used by `motion.li layout="position"` on grid items: when
// sidebar/inspector visibility flips, the shell resizes in one frame and
// motion FLIPs each card from its old to new position via composited
// transforms. Size deltas snap (see Library.Item) — we never animate
// width/height, only position+opacity.
//
// Linear-leaning durations: 220ms keeps the transition under the 250ms
// cause-and-effect threshold (Material defaults to 200ms, iOS spring to
// ~350ms). Lower bounce makes cards land instead of jiggle.
export const drawerSpring: Transition = {
  type: "spring",
  duration: 0.22,
  bounce: 0.1,
};
