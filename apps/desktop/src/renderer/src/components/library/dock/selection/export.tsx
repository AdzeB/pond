import {
  IconFileExportFill18 as Files,
  IconTableFill18 as Table,
} from "@pond/icons/fill/18";
import { TrayCard } from "@pond/ui";
import { useEffect, useState } from "react";
import { useDock } from "@/components/library/dock/lib/context";
import {
  exportSelectionCsv,
  exportSelectionFiles,
  type SelectionActionResult,
} from "@/lib/save/selection";
import { selection } from "@/stores/selection";
import styles from "./styles.module.css";

/** Long enough to read the swapped label before the card closes. */
const STATUS_HOLD_MS = 1200;

type ExportKey = "files" | "csv";

interface Status extends SelectionActionResult {
  key: ExportKey;
}

/** Export chooser opened from the selection pill's Export tile; running and outcome states swap into the row instead of toasting. */
export function SelectionExportSection() {
  const dock = useDock();
  const [runningKey, setRunningKey] = useState<ExportKey | null>(null);
  const [status, setStatus] = useState<Status | null>(null);
  const busy = runningKey !== null;

  useEffect(() => {
    if (!status) return;
    const timer = window.setTimeout(() => dock.closeViewMenu(), STATUS_HOLD_MS);
    return () => clearTimeout(timer);
  }, [status, dock]);

  const runExport = async (
    key: ExportKey,
    action: (ids: readonly string[]) => Promise<SelectionActionResult>,
  ) => {
    const scope = selection.snapshot();
    if (scope.length === 0 || busy || status) return;
    setRunningKey(key);
    try {
      const result = await action(scope);
      setStatus({ key, ...result });
    } finally {
      setRunningKey(null);
    }
  };

  const labelFor = (key: ExportKey, idle: string) => {
    if (status?.key === key) return status.message;
    if (runningKey === key) return "Exporting…";
    return idle;
  };

  return (
    <>
      <TrayCard.Header>
        <TrayCard.Back disabled={busy} onClick={() => dock.closeViewMenu()} />
        <TrayCard.Title position="center">Export</TrayCard.Title>
        <TrayCard.Close disabled={busy} />
        <TrayCard.Separator />
      </TrayCard.Header>
      <div className={styles.rows}>
        <button
          type="button"
          className={styles.row}
          disabled={busy || status !== null}
          onClick={() => void runExport("files", exportSelectionFiles)}
        >
          <span className={styles["row-icon"]}>
            <Files size={18} />
          </span>
          <span className={styles["row-text"]}>
            <span
              className={styles["row-label"]}
              data-tone={
                status?.key === "files" && !status.ok ? "error" : undefined
              }
            >
              {labelFor("files", "Export Files")}
            </span>
            <span className={styles["row-description"]}>
              Save copies of the files to a folder.
            </span>
          </span>
        </button>
        <button
          type="button"
          className={styles.row}
          disabled={busy || status !== null}
          onClick={() => void runExport("csv", exportSelectionCsv)}
        >
          <span className={styles["row-icon"]}>
            <Table size={18} />
          </span>
          <span className={styles["row-text"]}>
            <span
              className={styles["row-label"]}
              data-tone={
                status?.key === "csv" && !status.ok ? "error" : undefined
              }
            >
              {labelFor("csv", "Export to CSV")}
            </span>
            <span className={styles["row-description"]}>
              A spreadsheet of the selected items.
            </span>
          </span>
        </button>
      </div>
    </>
  );
}
