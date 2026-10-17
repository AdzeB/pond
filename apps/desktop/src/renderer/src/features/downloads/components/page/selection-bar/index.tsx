import {
  IconBan,
  IconMediaPauseFill,
  IconRefreshFill,
  IconTrashXmark,
} from "@pond/icons";
import { Button } from "@pond/ui";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type ReactNode, useState } from "react";
import {
  canCancelDownload,
  cancelDownloadRows,
  canRetryDownload,
  canSkipDownload,
  canTrashDownload,
  retryDownloadRows,
  skipDownloadRows,
  trashDownloadRows,
} from "@/features/downloads/components/lib/actions";
import type { DownloadRow } from "@/features/downloads/lib/status-feed";
import { downloadsSelection } from "@/features/downloads/state/downloads-selection";
import { gentleSpring } from "@/shared/lib/motion";
import styles from "./styles.module.css";

type BulkActionId = "retry" | "cancel" | "skip" | "trash";

interface BulkAction {
  id: BulkActionId;
  label: string;
  icon: ReactNode;
  applies: (row: DownloadRow) => boolean;
  run: (rows: readonly DownloadRow[]) => Promise<boolean>;
}

const BULK_ACTIONS: readonly BulkAction[] = [
  {
    id: "retry",
    label: "Retry",
    icon: <IconRefreshFill />,
    applies: canRetryDownload,
    run: retryDownloadRows,
  },
  {
    id: "cancel",
    label: "Cancel",
    icon: <IconMediaPauseFill />,
    applies: canCancelDownload,
    run: cancelDownloadRows,
  },
  {
    id: "skip",
    label: "Skip",
    icon: <IconBan />,
    applies: canSkipDownload,
    run: skipDownloadRows,
  },
  {
    id: "trash",
    label: "Move to Trash",
    icon: <IconTrashXmark />,
    applies: canTrashDownload,
    run: (rows) => trashDownloadRows(rows),
  },
];

function SelectionActions({ rows }: { rows: readonly DownloadRow[] }) {
  const [pending, setPending] = useState<BulkActionId | null>(null);
  const run = (action: BulkAction) => {
    setPending(action.id);
    void action.run(rows).finally(() => setPending(null));
  };
  return (
    <div className={styles.content}>
      <span className={styles.count} aria-live="polite">
        {rows.length} selected
      </span>
      <div className={styles.actions}>
        {BULK_ACTIONS.map((action) => (
          <Button
            key={action.id}
            size="sm"
            variant="secondary"
            disabled={pending !== null || !rows.some(action.applies)}
            loading={pending === action.id}
            onClick={() => run(action)}
          >
            {action.icon}
            {action.label}
          </Button>
        ))}
      </div>
      <Button size="sm" variant="ghost" onClick={downloadsSelection.clear}>
        Clear Selection
      </Button>
    </div>
  );
}

export function DownloadSelectionBar() {
  const rows = downloadsSelection.useRows();
  const reduceMotion = useReducedMotion();
  return (
    <AnimatePresence initial={false}>
      {rows.length > 0 ? (
        <motion.div
          key="selection"
          role="toolbar"
          aria-label="Selected Downloads"
          className={styles.bar}
          initial={{ height: 0, opacity: 0, y: -4 }}
          animate={{ height: "auto", opacity: 1, y: 0 }}
          exit={{ height: 0, opacity: 0, y: -4, pointerEvents: "none" }}
          transition={reduceMotion ? { duration: 0 } : gentleSpring}
        >
          <SelectionActions rows={rows} />
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
