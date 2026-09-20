import {
  IconCircleXmarkFill18 as Clear,
  IconRefreshFill18 as Retry,
  IconMediaPauseFill18 as Stop,
} from "@pond/icons/fill/18";
import { Button } from "@pond/ui";
import {
  confirmCancelDownloadRows,
  retryDownloadRows,
} from "@/features/downloads/components/lib/actions";
import {
  downloadsSelection,
  useDownloadsSelectionRows,
} from "@/features/downloads/state/downloads-selection";
import styles from "./styles.module.css";

export function DownloadsSelectionContent() {
  const rows = useDownloadsSelectionRows();

  return (
    <div className={styles.tiles}>
      <Button
        type="button"
        size="sm"
        variant="tertiary"
        className={styles.tile}
        onClick={() =>
          void retryDownloadRows(rows).then((did) => {
            if (did) downloadsSelection.clear();
          })
        }
      >
        <Retry />
        <span>Retry</span>
      </Button>
      <Button
        type="button"
        size="sm"
        variant="destructive"
        className={styles.tile}
        onClick={() => confirmCancelDownloadRows(rows)}
      >
        <Stop />
        <span>Cancel</span>
      </Button>
      <div className={styles.separator} />
      <Button
        type="button"
        size="sm"
        variant="tertiary"
        className={styles.tile}
        onClick={() => downloadsSelection.clear()}
      >
        <Clear />
        <span>Clear</span>
      </Button>
    </div>
  );
}
