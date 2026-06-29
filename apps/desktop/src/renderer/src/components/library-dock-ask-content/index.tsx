import { motion } from "motion/react";
import { AskComposer } from "@/components/ask-bar";
import { useDock } from "@/components/library-dock/lib/context";
import styles from "@/components/library-dock/styles.module.css";
import { bouncySpring } from "@/lib/ui/motion";
import { clearAsk } from "@/stores/ask-store";

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
