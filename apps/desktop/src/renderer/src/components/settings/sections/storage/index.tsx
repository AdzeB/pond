import { IconFolderOpenOutline18 as Folder } from "@pond/icons/outline/18";
import { Button } from "@pond/ui";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { prettyPath } from "@/lib/util/pretty-path";
import styles from "./styles.module.css";

interface LibraryInfo {
  path: string;
  name: string;
}

type ActionResult = { ok: true } | { ok: false; reason: string };

type BackupResult =
  | { ok: true; path: string; copied: number }
  | { ok: false; reason: string };

const FIRST_BACKUP_KEY = "pond.first-library-backup";

function backupErrorMessage(reason: string): string {
  switch (reason) {
    case "cancelled":
      return "";
    case "same_path":
      return "Pick a different location than the open library.";
    case "nested_path":
      return "Can't back up into a folder inside the library.";
    case "destination_exists":
      return "That folder already has files. Pick a new name.";
    case "no_library":
      return "No library is open to back up.";
    default:
      return `Couldn't back up library: ${reason}`;
  }
}

export function LocationRow() {
  const { data: info } = useQuery({
    queryKey: ["library-info"],
    queryFn: async () =>
      (await window.pond.query("library.info", {})) as LibraryInfo,
  });

  const [status, setStatus] = useState<string | null>(null);
  const [celebrate, setCelebrate] = useState(false);

  const openExisting = useMutation({
    mutationFn: async () => {
      setStatus(null);
      setCelebrate(false);
      const picked = (await window.pond.query("library.pickExisting", {})) as
        | { ok: true; path: string }
        | { ok: false; reason: string };
      if (!picked.ok) return;
      /** Switching relaunches, so there's no success state to settle into. */
      const res = (await window.pond.query("library.switchTo", {
        path: picked.path,
      })) as ActionResult;
      if (!res.ok) throw new Error(res.reason);
    },
  });

  const backup = useMutation({
    mutationFn: async () => {
      setStatus(null);
      setCelebrate(false);
      const res = (await window.pond.query(
        "library.backupTo",
        {},
      )) as BackupResult;
      if (!res.ok) {
        if (res.reason === "cancelled") return;
        throw new Error(backupErrorMessage(res.reason) || res.reason);
      }
      return res;
    },
    onSuccess: (res) => {
      if (!res) return;
      const first =
        typeof localStorage !== "undefined" &&
        localStorage.getItem(FIRST_BACKUP_KEY) !== "1";
      if (first) {
        localStorage.setItem(FIRST_BACKUP_KEY, "1");
        setCelebrate(true);
      }
      setStatus(`Backup saved to ${prettyPath(res.path)}`);
    },
  });

  const importEagle = useMutation({
    mutationFn: async () => {
      setStatus(null);
      setCelebrate(false);
      const picked = (await window.pond.query("saves.pickEagleLibrary", {})) as
        | { ok: true; path: string }
        | { ok: false; path: null };
      if (!picked.ok || !picked.path) return null;
      const res = (await window.pond.query("saves.importEagleLibrary", {
        path: picked.path,
      })) as {
        ok: boolean;
        imported: number;
        skipped: number;
        failed: number;
        error?: string;
      };
      if (!res.ok && res.error === "not_eagle_library") {
        throw new Error("That folder doesn't look like an Eagle library.");
      }
      if (!res.ok && res.imported === 0 && res.skipped === 0) {
        throw new Error(res.error ?? "Couldn't import Eagle library.");
      }
      return res;
    },
    onSuccess: (res) => {
      if (!res) return;
      const parts = [
        res.imported > 0
          ? `Imported ${res.imported} item${res.imported === 1 ? "" : "s"}`
          : null,
        res.skipped > 0 ? `skipped ${res.skipped}` : null,
        res.failed > 0 ? `failed ${res.failed}` : null,
      ].filter(Boolean);
      setStatus(parts.join(", ") || "Nothing new to import.");
    },
  });

  const openError = openExisting.isError
    ? openExisting.error instanceof Error
      ? `Couldn't open library: ${openExisting.error.message}`
      : "Couldn't open library."
    : null;

  const backupError = backup.isError
    ? backup.error instanceof Error
      ? backup.error.message
      : "Couldn't back up library."
    : null;

  const eagleError = importEagle.isError
    ? importEagle.error instanceof Error
      ? importEagle.error.message
      : "Couldn't import Eagle library."
    : null;

  const message = openError || backupError || eagleError || status;

  return (
    <div className={styles.stack}>
      <div className={styles.card}>
        <span aria-hidden className={styles.avatar}>
          <Folder size={20} />
        </span>
        <div className={styles.meta}>
          <span className={styles.name}>{info?.name ?? "Library"}</span>
          {info ? (
            <span className={styles.path}>{prettyPath(info.path)}</span>
          ) : null}
          {message ? (
            <span
              className={
                openError || backupError || eagleError
                  ? styles.error
                  : celebrate
                    ? styles.successCelebrate
                    : styles.success
              }
              role={openError || backupError || eagleError ? "alert" : "status"}
            >
              {message}
            </span>
          ) : null}
        </div>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => void window.pond.query("library.openInFinder", {})}
        >
          Reveal in Finder
        </Button>
      </div>
      <div className={styles.actions}>
        <div className={styles.action}>
          <div className={styles.actionMeta}>
            <span className={styles.actionTitle}>Backup Library</span>
            <span className={styles.actionDesc}>
              Copy this pond folder to another location. Your open library stays
              put.
            </span>
          </div>
          <Button
            size="sm"
            variant="secondary"
            disabled={backup.isPending}
            onClick={() => backup.mutate()}
          >
            {backup.isPending ? "Backing up…" : "Backup"}
          </Button>
        </div>
        <div className={styles.action}>
          <div className={styles.actionMeta}>
            <span className={styles.actionTitle}>Restore Library</span>
            <span className={styles.actionDesc}>
              Open a `.pond` backup. Pond switches to that folder and
              relaunches.
            </span>
          </div>
          <Button
            size="sm"
            variant="secondary"
            disabled={openExisting.isPending}
            onClick={() => openExisting.mutate()}
          >
            {openExisting.isPending ? "Opening…" : "Restore"}
          </Button>
        </div>
        <div className={styles.action}>
          <div className={styles.actionMeta}>
            <span className={styles.actionTitle}>Import Eagle Library</span>
            <span className={styles.actionDesc}>
              Bring items from an Eagle `.library` folder into this pond. Tags
              and folders become Pond tags.
            </span>
          </div>
          <Button
            size="sm"
            variant="secondary"
            disabled={importEagle.isPending}
            onClick={() => importEagle.mutate()}
          >
            {importEagle.isPending ? "Importing…" : "Import"}
          </Button>
        </div>
      </div>
    </div>
  );
}
