import { Button, Dialog } from "@pond/ui";
import type { ScreenshotDraft } from "@shared/screenshot-capture";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  readRecentFolderIds,
  rememberFolderDestinations,
} from "@/features/library/lib/recent-folders";
import { folders, useFolders } from "@/features/library/state/folders";
import { type ScreenshotDetails, ScreenshotDetailsFields } from "./details";
import { ScreenshotFolderBrowser } from "./folder-browser";
import styles from "./styles.module.css";

export function ScreenshotOrganizer({
  draft,
  onClose,
  showHeader = true,
}: {
  draft: ScreenshotDraft;
  onClose(): void;
  showHeader?: boolean;
}) {
  const rows = useFolders();
  const [details, setDetails] = useState<ScreenshotDetails>({
    title: draft.title,
    notes: "",
    tags: draft.tags,
    rating: 0,
  });
  const [folderId, setFolderId] = useState("");
  const [recentIds] = useState(readRecentFolderIds);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [loadingFolders, setLoadingFolders] = useState(true);
  const [folderError, setFolderError] = useState("");
  const pending = useRef(false);
  const refreshFolders = useCallback(async () => {
    setLoadingFolders(true);
    setFolderError("");
    try {
      await folders.refresh();
    } catch {
      setFolderError("Couldn't load folders. Try again.");
    } finally {
      setLoadingFolders(false);
    }
  }, []);
  useEffect(() => {
    void refreshFolders();
  }, [refreshFolders]);

  async function close() {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    try {
      await window.pond.query("screenshots.discard", { token: draft.token });
      onClose();
    } catch {
      setError("Couldn't discard the screenshot. Try again.");
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  async function save() {
    if (pending.current || loadingFolders || folderError) return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      await window.pond.query("screenshots.finish", {
        token: draft.token,
        ...details,
        folderId: folderId || null,
      });
      if (folderId) rememberFolderDestinations([folderId]);
      onClose();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Couldn't save the screenshot. Try again.",
      );
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  async function createFolder(name: string): Promise<boolean> {
    if (pending.current) return false;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      const folder = await window.pond.query("folders.create", {
        name,
        parentId: null,
      });
      setFolderId(folder.id);
      await refreshFolders();
      return true;
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Couldn't create the folder. Try again.",
      );
      return false;
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  const destination =
    rows.find((folder) => folder.id === folderId)?.name ?? "Library";
  return (
    <form
      className={styles.form}
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
    >
      {showHeader ? (
        <header className={styles.header}>
          <h1>Save Screenshot</h1>
        </header>
      ) : (
        <Dialog.Header>
          <Dialog.Title>Save Screenshot</Dialog.Title>
          <Dialog.Close disabled={busy} onClick={() => void close()} />
        </Dialog.Header>
      )}
      <p className={styles.description}>
        Add details and choose a folder for your screenshot.
      </p>
      <div className={styles.body}>
        <ScreenshotDetailsFields
          draft={draft}
          value={details}
          onChange={setDetails}
          disabled={busy}
        />
        <ScreenshotFolderBrowser
          folders={rows}
          value={folderId}
          onChange={setFolderId}
          onCreate={createFolder}
          recentIds={recentIds}
          loading={loadingFolders}
          error={folderError}
          onRetry={() => void refreshFolders()}
          disabled={busy}
        />
      </div>
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
      <footer className={styles.footer}>
        <span className={styles.destination} title={destination}>
          Save to {destination}
        </span>
        {showHeader ? (
          <Button
            type="button"
            variant="ghost"
            disabled={busy}
            onClick={() => void close()}
          >
            Cancel
          </Button>
        ) : null}
        <Button
          type="submit"
          loading={busy}
          disabled={loadingFolders || Boolean(folderError)}
        >
          Save Screenshot
        </Button>
      </footer>
    </form>
  );
}

export function ScreenshotOrganizeDialog({
  draft,
  open,
  onClose,
}: {
  draft: ScreenshotDraft;
  open: boolean;
  onClose(): void;
}) {
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next, event) => {
        if (!next) event.cancel();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop />
        <Dialog.Popup className={styles.popup} aria-label="Save Screenshot">
          <ScreenshotOrganizer
            draft={draft}
            onClose={onClose}
            showHeader={false}
          />
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
