import { Button, Dialog } from "@pond/ui";
import { useMemo, useState } from "react";
import { folders, useFolders } from "@/features/library/state/folders";
import { FolderMenu, type FolderMenuItem } from "@/features/saves";
import { usePrefs } from "@/shared/state/prefs";
import styles from "./styles.module.css";

/** Stands in for the top level so it can sit in the tree as a destination. */
const TOP_LEVEL = "\u0000top-level";

export function MoveFoldersDialog({
  ids,
  onClose,
}: {
  ids: readonly string[];
  onClose: () => void;
}) {
  const all = useFolders();
  const [destination, setDestination] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const moving = all.filter((folder) => ids.includes(folder.id));
  const blocked = useMemo(() => {
    const result = new Set(ids);
    let grew = true;
    while (grew) {
      grew = false;
      for (const folder of all)
        if (
          folder.parentId &&
          result.has(folder.parentId) &&
          !result.has(folder.id)
        ) {
          result.add(folder.id);
          grew = true;
        }
    }
    return result;
  }, [all, ids]);
  const [folderViews] = usePrefs("folderViews");
  const items: FolderMenuItem[] = [
    {
      id: TOP_LEVEL,
      name: "Folders",
      parentId: null,
      count: destination === TOP_LEVEL ? 1 : 0,
    },
    ...all.map((folder) => ({
      id: folder.id,
      name: folder.name,
      parentId: folder.parentId ?? TOP_LEVEL,
      icon: folderViews[folder.id]?.icon,
      color: folder.color,
      count: destination === folder.id ? 1 : 0,
      disabled: blocked.has(folder.id),
    })),
  ];
  const parentId = destination === TOP_LEVEL ? null : destination;
  const unchanged =
    destination === null ||
    moving.every((folder) => (folder.parentId ?? null) === parentId);
  const title =
    ids.length === 1 && moving[0]
      ? `Move "${moving[0].name}"`
      : `Move ${ids.length} Folders`;

  async function move() {
    setBusy(true);
    setError(null);
    try {
      await window.pond.query("folders.moveBatch", {
        ids: [...ids],
        parentId,
      });
      await folders.refresh();
      onClose();
    } catch {
      setError("Couldn't move folders. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop />
        <Dialog.Popup className={styles.popup}>
          <Dialog.Header>
            <Dialog.Title>{title}</Dialog.Title>
          </Dialog.Header>
          <Dialog.Description>
            Choose a destination. Subfolders move with their parent.
          </Dialog.Description>
          <Dialog.Content className={styles.content}>
            <div className={styles.menu}>
              <FolderMenu
                folders={items}
                selectionSize={1}
                selection="single"
                onToggle={(folder) => setDestination(folder.id)}
              />
            </div>
            {error ? (
              <p className={styles.error} role="alert">
                {error}
              </p>
            ) : null}
          </Dialog.Content>
          <Dialog.Footer>
            <Dialog.Cancel disabled={busy} />
            <Button
              type="button"
              variant="primary"
              disabled={busy || unchanged}
              loading={busy}
              onClick={() => void move()}
            >
              Move
            </Button>
          </Dialog.Footer>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
