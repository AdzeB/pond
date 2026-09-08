import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";
import { gentleSpring } from "@/shared/lib/motion";
import styles from "./page.module.css";

export function IconSwap({
  id,
  children,
}: {
  id: string;
  children: ReactNode;
}) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.span
        key={id}
        className={styles.swap}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        transition={gentleSpring}
        aria-hidden
      >
        {children}
      </motion.span>
    </AnimatePresence>
  );
}
