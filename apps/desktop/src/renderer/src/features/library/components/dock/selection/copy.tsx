import {
  IconFolderFill18 as Folder,
  IconLink2Fill18 as Link,
} from "@pond/icons/fill/18";
import { Button, TrayCard } from "@pond/ui";
import { useEffect, useState } from "react";
import { useDock } from "@/features/library/components/dock/lib/context";
import { selection } from "@/features/library/state/selection";
import {
  copyFilePathsForSelection,
  copyUrlsForSelection,
  type SelectionActionResult,
} from "@/features/saves/lib/selection";
import styles from "./selection.module.css";

const STATUS_HOLD_MS = 1200;

type CopyKey = "links" | "paths";

interface Status extends SelectionActionResult {
  key: CopyKey;
}

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
        <TrayCard.Title>Copy</TrayCard.Title>
        <TrayCard.Close disabled={busy} />
        <TrayCard.Separator />
      </TrayCard.Header>
      <div className={styles.rows}>
        <Button
          variant="ghost"
          size="xl"
          width="full"
          className={styles.row}
          disabled={busy || status !== null}
          onClick={() => void copy("links", copyUrlsForSelection)}
        >
          <span className={styles.icon}>
            <Link size={18} />
          </span>
          <span className={styles.text}>
            <span
              className={styles.label}
              data-tone={
                status?.key === "links" && !status.ok ? "error" : undefined
              }
            >
              {labelFor("links", "Copy Links")}
            </span>
            <span className={styles.description}>
              The web addresses of the selected items.
            </span>
          </span>
        </Button>
        <Button
          variant="ghost"
          size="xl"
          width="full"
          className={styles.row}
          disabled={busy || status !== null}
          onClick={() => void copy("paths", copyFilePathsForSelection)}
        >
          <span className={styles.icon}>
            <Folder size={18} />
          </span>
          <span className={styles.text}>
            <span
              className={styles.label}
              data-tone={
                status?.key === "paths" && !status.ok ? "error" : undefined
              }
            >
              {labelFor("paths", "Copy File Paths")}
            </span>
            <span className={styles.description}>
              Where the files live on disk.
            </span>
          </span>
        </Button>
      </div>
    </>
  );
}
