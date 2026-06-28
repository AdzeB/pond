import { motion } from "motion/react";
import { AskStatusPill } from "@/components/ask-bar";
import { bouncySpring } from "@/lib/motion";
import { useDock } from "./context";
import styles from "./styles.module.css";

export function StatusContent() {
  const dock = useDock();

  return (
    <motion.div
      key="status"
      className={styles.askRow}
      layout="position"
      {...dock.swap}
      transition={bouncySpring}
    >
      <AskStatusPill onReopen={dock.openAsk} onClear={dock.clearResults} />
    </motion.div>
  );
}
