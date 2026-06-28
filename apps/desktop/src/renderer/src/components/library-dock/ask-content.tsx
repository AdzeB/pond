import { motion } from "motion/react";
import { AskComposer } from "@/components/ask-bar";
import { bouncySpring } from "@/lib/motion";
import { clearAsk } from "@/stores/ask-store";
import { useDock } from "./context";
import styles from "./styles.module.css";

export function AskContent() {
  const dock = useDock();

  return (
    <motion.div
      key="ask"
      className={styles.askRow}
      layout="position"
      {...dock.swap}
      transition={bouncySpring}
    >
      <AskComposer autoFocus onCollapse={dock.closeAsk} onClear={clearAsk} />
    </motion.div>
  );
}
