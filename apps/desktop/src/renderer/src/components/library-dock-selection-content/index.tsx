import {
  IconCircleXmarkFill18 as Clear,
  IconCopyFill18 as Copy,
  IconFileExportFill18 as Export,
  IconArrowRotateAnticlockwiseFill18 as Restore,
  IconTagPlusFill18 as TagAdd,
  IconTrash2ContentFill18 as Trash,
  IconWandSparkleFill18 as Wand,
} from "@pond/icons/fill/18";
import { motion } from "motion/react";
import { forwardRef } from "react";
import { useDock } from "@/components/library-dock/lib/context";
import { selection } from "@/stores/selection";
import styles from "./styles.module.css";

/** Every selection action as a labeled tile, so nothing hides behind a menu. */
export const SelectionContent = forwardRef<HTMLDivElement>((_, ref) => {
  const dock = useDock();

  return (
    <motion.div
      ref={ref}
      key="selection"
      className={styles.tiles}
      transition={dock.swapTransition}
      {...dock.swap}
    >
      <button
        type="button"
        className={styles.tile}
        onClick={() => dock.openViewMenu("selection-run")}
      >
        <Wand size={18} />
        <span>Run</span>
      </button>
      <button
        type="button"
        className={styles.tile}
        onClick={() => dock.openViewMenu("selection-tag")}
      >
        <TagAdd size={18} />
        <span>Tag</span>
      </button>
      <button
        type="button"
        className={styles.tile}
        onClick={() => dock.openViewMenu("selection-copy")}
      >
        <Copy size={18} />
        <span>Copy</span>
      </button>
      <button
        type="button"
        className={styles.tile}
        onClick={() => dock.openViewMenu("selection-export")}
      >
        <Export size={18} />
        <span>Export</span>
      </button>
      {dock.inTrash ? (
        <>
          <button
            type="button"
            className={styles.tile}
            onClick={dock.destructive}
          >
            <Restore size={18} />
            <span>Restore</span>
          </button>
          <button
            type="button"
            className={styles.tile}
            data-danger
            onClick={dock.confirmDeleteForever}
          >
            <Trash size={18} />
            <span>Delete</span>
          </button>
        </>
      ) : (
        <button
          type="button"
          className={styles.tile}
          data-danger
          onClick={dock.destructive}
        >
          <Trash size={18} />
          <span>Delete</span>
        </button>
      )}
      <div className={styles.separator} />
      <button
        type="button"
        className={styles.tile}
        onClick={() => selection.clear()}
      >
        <Clear size={18} />
        <span>Clear</span>
      </button>
    </motion.div>
  );
});
SelectionContent.displayName = "SelectionContent";
