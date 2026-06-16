import { IconTrash2Fill18 as Trash } from "@pond/icons/fill/18";
import { Tooltip } from "@pond/ui";
import { AnimatePresence, motion } from "motion/react";
import { formatNumber } from "@/lib/format";
import { bouncySpring, snappySpring } from "@/lib/motion";
import { trashSaves } from "@/lib/mutate-save";
import {
  selection,
  useSelectedIds,
  useSelectionSize,
} from "@/stores/selection";
import styles from "./styles.module.css";

// Primary nav + global actions now live in the top toolbar (see
// `library-toolbar/nav-cluster`). The dock is reduced to the contextual
// selection pill, which stays floating at the bottom while saves are selected.
export function Dock() {
  const selectionSize = useSelectionSize();

  return (
    <div className={styles.dock}>
      <AnimatePresence>
        {selectionSize > 0 ? (
          <SelectionGroup key="selection" count={selectionSize} />
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function SelectionGroup({ count }: { count: number }) {
  const ids = useSelectedIds();

  const moveToTrash = async () => {
    await trashSaves(ids);
    selection.clear();
  };

  return (
    <motion.div
      className={styles.selectionPill}
      initial={{ opacity: 0, scale: 0.85, x: -8 }}
      animate={{ opacity: 1, scale: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.85, x: -8 }}
      transition={bouncySpring}
    >
      <span
        className={styles.count}
        role="status"
        aria-label={`${formatNumber(count)} selected`}
      >
        {formatNumber(count)}
      </span>

      <Tooltip label="Move to trash" side="top">
        <motion.button
          type="button"
          className={`${styles.item} ${styles.danger}`}
          aria-label="Move selected to trash"
          onClick={moveToTrash}
          whileTap={{ rotate: -8 }}
          transition={snappySpring}
        >
          <span className={styles.icon}>
            <Trash />
          </span>
        </motion.button>
      </Tooltip>

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
