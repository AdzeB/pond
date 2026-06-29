import { motion } from "motion/react";
import { AskComposer } from "@/components/ask-bar";
import { useDock } from "@/components/library-dock/lib/context";
import { bouncySpring } from "@/lib/ui/motion";
import { clearAsk } from "@/stores/ask-store";
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
