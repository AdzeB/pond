import { motion } from "motion/react";
import { AskStatusPill } from "@/components/ask-bar";
import { useDock } from "@/components/library-dock/lib/context";
import styles from "@/components/library-dock/styles.module.css";
import { bouncySpring } from "@/lib/ui/motion";

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
