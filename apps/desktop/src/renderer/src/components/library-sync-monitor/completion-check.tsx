import { motion, useReducedMotion } from "motion/react";

// A small checkmark that springs in and draws its stroke. Used as a quiet
// reward when a sync or backfill just finished. Static under reduced motion.
export function CompletionCheck() {
  const reduce = useReducedMotion();
  return (
    <motion.svg
      width={12}
      height={12}
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden
      initial={reduce ? false : { scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: "spring", bounce: 0.5, duration: 0.4 }}
    >
      <motion.path
        d="M2.5 6.4 5 8.9 9.5 3.5"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={reduce ? false : { pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.3, delay: reduce ? 0 : 0.12 }}
      />
    </motion.svg>
  );
}
