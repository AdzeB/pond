import { motion } from "motion/react";
import { useDock } from "@/components/library-dock/lib/context";
import { SearchComposer } from "@/components/search-bar";
import { bouncySpring } from "@/lib/ui/motion";
import styles from "./styles.module.css";

export function SearchContent() {
  const dock = useDock();

  return (
    <motion.div
      key="search"
      className={styles.searchRow}
      layout="position"
      {...dock.swap}
      transition={bouncySpring}
    >
      <SearchComposer autoFocus onCollapse={dock.closeSearch} />
    </motion.div>
  );
}
