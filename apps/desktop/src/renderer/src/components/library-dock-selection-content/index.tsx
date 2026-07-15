import {
  IconDotsFill18 as More,
  IconArrowRotateAnticlockwiseFill18 as Restore,
  IconTagPlusFill18 as TagAdd,
  IconTrash2ContentFill18 as Trash,
  IconWandSparkleFill18 as Wand,
} from "@pond/icons/fill/18";
import { Tray } from "@pond/ui";
import { motion } from "motion/react";
import { forwardRef } from "react";
import { useDock } from "@/components/library-dock/lib/context";
import { snappySpring } from "@/lib/ui/motion";
import { selection } from "@/stores/selection";
import styles from "./styles.module.css";

export const SelectionContent = forwardRef<HTMLDivElement>((_, ref) => {
  const dock = useDock();

  return (
    <motion.div
      ref={ref}
      key="selection"
      className={styles.row}
      transition={dock.swapTransition}
      {...dock.swap}
    >
      <Tray.Item
        render={
          <motion.button
            type="button"
            whileTap={{ rotate: -8 }}
            transition={snappySpring}
          />
        }
        aria-label="Run task on selection"
        onClick={dock.runSelectionTask}
      >
        <Wand />
      </Tray.Item>

      <Tray.Item
        render={
          <motion.button
            type="button"
            whileTap={{ rotate: -8 }}
            transition={snappySpring}
          />
        }
        aria-label="Tag selection"
        onClick={dock.openTagMenu}
      >
        <TagAdd />
      </Tray.Item>

      <Tray.Item
        render={
          <motion.button
            type="button"
            whileTap={{ rotate: -8 }}
            transition={snappySpring}
          />
        }
        className={dock.inTrash ? undefined : `${styles.item} ${styles.danger}`}
        aria-label={
          dock.inTrash ? "Restore selection" : "Move selection to trash"
        }
        onClick={dock.destructive}
      >
        {dock.inTrash ? <Restore /> : <Trash />}
      </Tray.Item>

      <Tray.Item
        render={
          <motion.button
            type="button"
            whileTap={{ scale: 0.9 }}
            transition={snappySpring}
          />
        }
        aria-label="More actions"
        onClick={dock.openOverflowMenu}
      >
        <More />
      </Tray.Item>

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
});
SelectionContent.displayName = "SelectionContent";
