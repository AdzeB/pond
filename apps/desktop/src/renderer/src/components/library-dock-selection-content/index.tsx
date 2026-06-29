import {
  IconDotsFill18 as More,
  IconArrowRotateAnticlockwiseFill18 as Restore,
  IconTagPlusFill18 as TagAdd,
  IconTrash2ContentFill18 as Trash,
  IconWandSparkleFill18 as Wand,
} from "@pond/icons/fill/18";
import { motion } from "motion/react";
import { useDock } from "@/components/library-dock/lib/context";
import styles from "@/components/library-dock/styles.module.css";
import { selectAllInView } from "@/lib/save/selection";
import { bouncySpring, snappySpring } from "@/lib/ui/motion";
import { formatNumber } from "@/lib/util/format";
import { selection } from "@/stores/selection";

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

      <motion.button
        type="button"
        className={styles.item}
        aria-label="Run task on selection"
        onClick={dock.runSelectionTask}
        whileTap={{ rotate: -8 }}
        transition={snappySpring}
      >
        <span className={styles.icon}>
          <Wand />
        </span>
      </motion.button>

      <motion.button
        type="button"
        className={styles.item}
        aria-label="Tag selection"
        onClick={dock.openTagMenu}
        whileTap={{ rotate: -8 }}
        transition={snappySpring}
      >
        <span className={styles.icon}>
          <TagAdd />
        </span>
      </motion.button>

      <motion.button
        type="button"
        className={`${styles.item} ${dock.inTrash ? "" : styles.danger}`}
        aria-label={
          dock.inTrash ? "Restore selection" : "Move selection to trash"
        }
        onClick={dock.destructive}
        whileTap={{ rotate: -8 }}
        transition={snappySpring}
      >
        <span className={styles.icon}>
          {dock.inTrash ? <Restore /> : <Trash />}
        </span>
      </motion.button>

      <motion.button
        type="button"
        className={styles.item}
        aria-label="More actions"
        onClick={dock.openOverflowMenu}
        whileTap={{ scale: 0.9 }}
        transition={snappySpring}
      >
        <span className={styles.icon}>
          <More />
        </span>
      </motion.button>

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
