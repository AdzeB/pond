import {
  IconCircleXmarkFill18 as Clear,
  IconRefreshFill18 as Sync,
} from "@pond/icons/fill/18";
import { motion } from "motion/react";
import { forwardRef } from "react";
import { useDock } from "@/components/library/dock/lib/context";
import { sourceCanSyncNow } from "@/components/library/sources/page/lib/helpers";
import {
  sourcesSelection,
  useSourcesSelectionRows,
} from "@/stores/sources-selection";
import styles from "./styles.module.css";

export const SourcesSelectionContent = forwardRef<HTMLDivElement>((_, ref) => {
  const dock = useDock();
  const rows = useSourcesSelectionRows();

  return (
    <motion.div
      ref={ref}
      key="sources-selection"
      className={styles.tiles}
      transition={dock.swapTransition}
      {...dock.swap}
    >
      <button
        type="button"
        className={styles.tile}
        onClick={() => {
          let did = false;
          for (const row of rows) {
            if (!sourceCanSyncNow(row)) continue;
            void window.pond.syncRunNow(row.id);
            did = true;
          }
          if (did) sourcesSelection.clear();
        }}
      >
        <Sync />
        <span>Sync</span>
      </button>
      <div className={styles.separator} />
      <button
        type="button"
        className={styles.tile}
        onClick={() => sourcesSelection.clear()}
      >
        <Clear />
        <span>Clear</span>
      </button>
    </motion.div>
  );
});
SourcesSelectionContent.displayName = "SourcesSelectionContent";
