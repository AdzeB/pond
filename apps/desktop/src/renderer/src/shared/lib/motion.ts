import type { Transition } from "motion/react";

export const gentleSpring: Transition = {
  type: "spring",
  duration: 0.22,
  bounce: 0.1,
};

export const bouncySpring: Transition = {
  type: "spring",
  duration: 0.34,
  bounce: 0.28,
};
