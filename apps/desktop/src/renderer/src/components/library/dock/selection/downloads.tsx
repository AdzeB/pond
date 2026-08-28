import {
  IconCircleXmarkFill18 as Clear,
  IconRefreshFill18 as Retry,
  IconMediaPauseFill18 as Stop,
} from "@pond/icons/fill/18";
import { motion } from "motion/react";
import { forwardRef } from "react";
import { useDock } from "@/components/library/dock/lib/context";
import {
  confirmCancelDownloadRows,
  retryDownloadRows,
} from "@/components/library/downloads/lib/actions";
import {
  downloadsSelection,
  useDownloadsSelectionRows,
} from "@/stores/downloads-selection";
import styles from "./styles.module.css";

export const DownloadsSelectionContent = forwardRef<HTMLDivElement>(
  (_, ref) => {
    const dock = useDock();
    const rows = useDownloadsSelectionRows();

    return (
      <motion.div
        ref={ref}
        key="downloads-selection"
        className={styles.tiles}
        transition={dock.swapTransition}
        {...dock.swap}
      >
        <button
          type="button"
          className={styles.tile}
          onClick={() =>
            void retryDownloadRows(rows).then((did) => {
              if (did) downloadsSelection.clear();
            })
          }
        >
          <Retry />
          <span>Retry</span>
        </button>
        <button
          type="button"
          className={styles.tile}
          data-danger
          onClick={() => confirmCancelDownloadRows(rows)}
        >
          <Stop />
          <span>Cancel</span>
        </button>
        <div className={styles.separator} />
        <button
          type="button"
          className={styles.tile}
          onClick={() => downloadsSelection.clear()}
        >
          <Clear />
          <span>Clear</span>
        </button>
      </motion.div>
    );
  },
);
DownloadsSelectionContent.displayName = "DownloadsSelectionContent";
