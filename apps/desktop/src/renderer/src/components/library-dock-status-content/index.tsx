import { motion } from "motion/react";
import { AskStatusPill } from "@/components/ask-bar";
import { useDock } from "@/components/library-dock/lib/context";
import { bouncySpring } from "@/lib/ui/motion";
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
