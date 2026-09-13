import {
  IconCircleXmarkFill18 as Clear,
  IconRefreshFill18 as Retry,
  IconMediaPauseFill18 as Stop,
} from "@pond/icons/fill/18";
import {
  confirmCancelDownloadRows,
  retryDownloadRows,
} from "@/features/downloads/components/lib/actions";
import {
  downloadsSelection,
  useDownloadsSelectionRows,
} from "@/features/downloads/state/downloads-selection";
import styles from "./selection.module.css";

export function DownloadsSelectionContent() {
  const rows = useDownloadsSelectionRows();

  return (
    <div className={styles.tiles}>
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
    </div>
  );
}
