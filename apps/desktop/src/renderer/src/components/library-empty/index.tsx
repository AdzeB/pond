import { motion, useReducedMotion } from "motion/react";
import styles from "./styles.module.css";

/** The bobbing arrow points toward the dock where new saves land. */
export function WelcomeEmpty() {
  const reduce = useReducedMotion();
  return (
    <div className={styles.welcome}>
      <p className={styles.text}>
        No saves yet.
        <br />
        Drop a link, image, or file to get started.
      </p>
      <motion.span
        className={styles.arrow}
        aria-hidden
        animate={reduce ? undefined : { y: [0, 6, 0] }}
        transition={
          reduce
            ? undefined
            : {
                duration: 1.6,
                repeat: Number.POSITIVE_INFINITY,
                ease: "easeInOut",
              }
        }
      >
        <svg
          width="20"
          height="24"
          viewBox="0 0 20 24"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M10 2v18M3 13l7 7 7-7"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </motion.span>
    </div>
  );
}
