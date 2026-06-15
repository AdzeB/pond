import type { Source } from "@pond/schema/db";
import { motion } from "motion/react";
import { directionalVariants, drawerSpring } from "@/lib/motion";
import type { SyncSourceStatus } from "@/stores/sync-monitor";
import { OverviewTile } from "./source-tile";
import styles from "./styles.module.css";

export function Overview({
  sources,
  bySource,
  summary,
  direction,
  onSelect,
}: {
  sources: readonly Source[];
  bySource: Partial<Record<Source, SyncSourceStatus>>;
  summary: string;
  direction: "forward" | "backward";
  onSelect: (source: Source) => void;
}) {
  return (
    <motion.div
      key="overview"
      className={styles.view}
      custom={direction}
      variants={directionalVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={drawerSpring}
    >
      <div className={styles.grid}>
        {sources.map((source) => (
          <OverviewTile
            key={source}
            source={source}
            status={bySource[source]}
            onSelect={() => onSelect(source)}
          />
        ))}
      </div>
      <div className={styles.footer}>{summary}</div>
    </motion.div>
  );
}
