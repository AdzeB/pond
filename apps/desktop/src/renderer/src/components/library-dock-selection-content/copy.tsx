import {
  IconFolderFill18 as Folder,
  IconLinkFill18 as Link,
} from "@pond/icons/fill/18";
import { TrayCard } from "@pond/ui";
import { useEffect, useState } from "react";
import { useDock } from "@/components/library-dock/lib/context";
import {
  copyFilePathsForSelection,
  copyUrlsForSelection,
  type SelectionActionResult,
} from "@/lib/save/selection";
import { selection } from "@/stores/selection";
import styles from "./cards.module.css";

/** Long enough to read the swapped label before the card closes. */
const STATUS_HOLD_MS = 1200;

type CopyKey = "links" | "paths";

interface Status extends SelectionActionResult {
  key: CopyKey;
}

/** Copy chooser opened from the selection pill's Copy tile; the outcome swaps into the row label instead of toasting. */
export function SelectionCopySection() {
  const dock = useDock();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status | null>(null);

  useEffect(() => {
    if (!status) return;
    const timer = window.setTimeout(() => dock.closeViewMenu(), STATUS_HOLD_MS);
    return () => clearTimeout(timer);
  }, [status, dock]);

  const copy = async (
    key: CopyKey,
    action: (ids: readonly string[]) => Promise<SelectionActionResult>,
  ) => {
    const scope = selection.snapshot();
    if (scope.length === 0 || busy || status) return;
    setBusy(true);
    try {
      const result = await action(scope);
      setStatus({ key, ...result });
    } finally {
      setBusy(false);
    }
  };

  const labelFor = (key: CopyKey, idle: string) =>
    status?.key === key ? status.message : idle;

  return (
    <>
      <TrayCard.Header>
        <TrayCard.Back disabled={busy} onClick={() => dock.closeViewMenu()} />
        <TrayCard.Title position="center">Copy</TrayCard.Title>
        <TrayCard.Close disabled={busy} />
        <TrayCard.Separator />
      </TrayCard.Header>
      <div className={styles.rows}>
        <button
          type="button"
          className={styles.row}
          disabled={busy || status !== null}
          onClick={() => void copy("links", copyUrlsForSelection)}
        >
          <span className={styles["row-icon"]}>
            <Link size={18} />
          </span>
          <span className={styles["row-text"]}>
            <span
              className={styles["row-label"]}
              data-tone={
                status?.key === "links" && !status.ok ? "error" : undefined
              }
            >
              {labelFor("links", "Copy Links")}
            </span>
            <span className={styles["row-description"]}>
              The web addresses of the selected items.
            </span>
          </span>
        </button>
        <button
          type="button"
          className={styles.row}
          disabled={busy || status !== null}
          onClick={() => void copy("paths", copyFilePathsForSelection)}
        >
          <span className={styles["row-icon"]}>
            <Folder size={18} />
          </span>
          <span className={styles["row-text"]}>
            <span
              className={styles["row-label"]}
              data-tone={
                status?.key === "paths" && !status.ok ? "error" : undefined
              }
            >
              {labelFor("paths", "Copy File Paths")}
            </span>
            <span className={styles["row-description"]}>
              Where the files live on disk.
            </span>
          </span>
        </button>
      </div>
    </>
  );
}
