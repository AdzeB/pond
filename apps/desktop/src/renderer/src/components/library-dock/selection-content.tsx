import {
  IconDotsFill18 as More,
  IconArrowRotateAnticlockwiseFill18 as Restore,
  IconTagPlusFill18 as TagAdd,
  IconTrash2ContentFill18 as Trash,
  IconWandSparkleFill18 as Wand,
} from "@pond/icons/fill/18";
import { Tooltip } from "@pond/ui";
import { motion } from "motion/react";
import { formatNumber } from "@/lib/format";
import { bouncySpring, snappySpring } from "@/lib/motion";
import { selectAllInView } from "@/lib/selection-actions";
import { selection } from "@/stores/selection";
import { useDock } from "./context";
import styles from "./styles.module.css";

export function SelectionContent() {
  const dock = useDock();

  return (
    <motion.div
      key="selection"
      className={styles.row}
      layout="position"
      {...dock.swap}
      transition={bouncySpring}
    >
      <button
        type="button"
        className={styles.count}
        aria-label={
          dock.allSelected
            ? `${formatNumber(dock.selectionSize)} selected`
            : `${formatNumber(dock.selectionSize)} selected, select all`
        }
        onClick={() => selectAllInView()}
      >
        {formatNumber(dock.selectionSize)}
        {dock.filteredCount > dock.selectionSize ? (
          <span className={styles.countTotal}>
            /{formatNumber(dock.filteredCount)}
          </span>
        ) : null}
      </button>

      <Tooltip.Trigger
        handle={dock.tooltip}
        className={styles.item}
        payload="Run task"
        aria-label="Run task on selection"
        render={
          <motion.button
            type="button"
            onClick={dock.runSelectionTask}
            whileTap={{ rotate: -8 }}
            transition={snappySpring}
          >
            <span className={styles.icon}>
              <Wand />
            </span>
          </motion.button>
        }
      />

      <Tooltip.Trigger
        handle={dock.tooltip}
        className={styles.item}
        payload="Tag"
        aria-label="Tag selection"
        render={
          <motion.button
            type="button"
            onClick={dock.openTagMenu}
            whileTap={{ rotate: -8 }}
            transition={snappySpring}
          >
            <span className={styles.icon}>
              <TagAdd />
            </span>
          </motion.button>
        }
      />

      <Tooltip.Trigger
        handle={dock.tooltip}
        className={`${styles.item} ${dock.inTrash ? "" : styles.danger}`}
        payload={dock.inTrash ? "Restore" : "Move to Trash"}
        aria-label={
          dock.inTrash ? "Restore selection" : "Move selection to trash"
        }
        render={
          <motion.button
            type="button"
            onClick={dock.destructive}
            whileTap={{ rotate: -8 }}
            transition={snappySpring}
          >
            <span className={styles.icon}>
              {dock.inTrash ? <Restore /> : <Trash />}
            </span>
          </motion.button>
        }
      />

      <Tooltip.Trigger
        handle={dock.tooltip}
        className={styles.item}
        payload="More"
        aria-label="More actions"
        render={
          <motion.button
            type="button"
            onClick={dock.openOverflowMenu}
            whileTap={{ scale: 0.9 }}
            transition={snappySpring}
          >
            <span className={styles.icon}>
              <More />
            </span>
          </motion.button>
        }
      />

      <button
        type="button"
        className={styles.clear}
        aria-label="Clear selection"
        onClick={() => selection.clear()}
      >
        Clear
      </button>
    </motion.div>
  );
}
