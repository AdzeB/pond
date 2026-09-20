import { Button, Checkbox, Dialog, Input } from "@pond/ui";
import { useSelector } from "@tanstack/react-store";
import { useEffect, useId, useMemo, useState } from "react";
import {
  readRecentFolderIds,
  rememberFolderDestinations,
} from "@/features/library/lib/recent-folders";
import {
  closeFolderPicker,
  folderPickerStore,
} from "@/features/library/state/folder-picker";
import {
  folders,
  useFolderMemberships,
  useFolders,
} from "@/features/library/state/folders";
import styles from "./styles.module.css";

export function FolderPickerHost() {
  const ids = useSelector(folderPickerStore, (state) => state);
  return ids.length ? <FolderPicker ids={ids} key={ids.join("\n")} /> : null;
}
function FolderPicker({ ids }: { ids: readonly string[] }) {
  const controlId = useId();
  const rows = useFolders();
  const memberships = useFolderMemberships();
  const [search, setSearch] = useState("");
  const [changes, setChanges] = useState<Record<string, boolean>>({});
  const [recent] = useState(readRecentFolderIds);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    void folders.refresh();
  }, []);
  const matches = useMemo(() => {
    const byId = new Map(rows.map((folder) => [folder.id, folder]));
    const path = (id: string) => {
      const parts: string[] = [];
      const seen = new Set<string>();
      let row = byId.get(id);
      while (row && !seen.has(row.id)) {
        seen.add(row.id);
        parts.unshift(row.name);
        row = row.parentId ? byId.get(row.parentId) : undefined;
      }
      return parts.join(" / ");
    };
    return rows
      .map((folder) => ({ ...folder, label: path(folder.id) }))
      .filter((folder) =>
        folder.label.toLowerCase().includes(search.toLowerCase()),
      )
      .sort(
        (a, b) =>
          (recent.includes(b.id) ? 1 : 0) - (recent.includes(a.id) ? 1 : 0) ||
          a.label.localeCompare(b.label),
      );
  }, [rows, search, recent]);
  async function apply(next = changes) {
    setBusy(true);
    setError(null);
    try {
      const addIds = Object.keys(next).filter((id) => next[id]);
      const removeIds = Object.keys(next).filter((id) => !next[id]);
      await window.pond.query("folders.assign", {
        saveIds: [...ids],
        addIds,
        removeIds,
      });
      if (addIds.length) rememberFolderDestinations(addIds);
      await folders.refresh();
      closeFolderPicker();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not assign folders.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function create() {
    if (!search.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const folder = await window.pond.query("folders.create", {
        name: search.trim(),
      });
      await folders.refresh();
      setChanges((prev) => ({ ...prev, [folder.id]: true }));
      setSearch("");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not create folder.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open && !busy) closeFolderPicker();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop />
        <Dialog.Popup className={styles.popup}>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void apply();
            }}
          >
            <Dialog.Header>
              <Dialog.Title>Assign Folders</Dialog.Title>
              <Dialog.Close disabled={busy} />
            </Dialog.Header>
            <Dialog.Description>
              {ids.length === 1
                ? "Choose folders for this save."
                : `Choose folders for ${ids.length} saves.`}
            </Dialog.Description>
            <Input.Root>
              <Input.Field
                autoFocus
                aria-label="Search folders"
                value={search}
                onValueChange={setSearch}
              />
            </Input.Root>
            <div className={styles.list}>
              {matches.map((folder, index) => {
                const assigned = ids.filter((id) =>
                  (memberships[id] ?? []).includes(folder.id),
                ).length;
                const checked = changes[folder.id] ?? assigned === ids.length;
                const mixed =
                  changes[folder.id] === undefined &&
                  assigned > 0 &&
                  assigned < ids.length;
                return (
                  <div key={folder.id} className={styles.row}>
                    <Checkbox.Root
                      id={`${controlId}-folder-${index}`}
                      aria-label={folder.label}
                      checked={checked}
                      indeterminate={mixed}
                      disabled={busy}
                      onCheckedChange={(next) =>
                        setChanges((prev) => ({
                          ...prev,
                          [folder.id]: next,
                        }))
                      }
                    >
                      <Checkbox.Indicator />
                    </Checkbox.Root>
                    <label htmlFor={`${controlId}-folder-${index}`}>
                      {folder.label}
                    </label>
                    {recent.includes(folder.id) ? <small>Recent</small> : null}
                  </div>
                );
              })}
            </div>
            {search.trim() ? (
              <Button
                type="button"
                disabled={busy}
                onClick={() => void create()}
              >
                Create “{search.trim()}”
              </Button>
            ) : null}
            {error ? <p role="alert">{error}</p> : null}
            <div className={styles.footer}>
              <Button
                type="button"
                disabled={
                  busy ||
                  !recent.some((id) => rows.some((row) => row.id === id))
                }
                onClick={() =>
                  void apply(
                    Object.fromEntries(
                      recent
                        .slice(0, 1)
                        .filter((id) => rows.some((row) => row.id === id))
                        .map((id) => [id, true]),
                    ),
                  )
                }
              >
                Repeat Last
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={busy || !Object.keys(changes).length}
                loading={busy}
              >
                {busy ? "Saving" : "Apply"}
              </Button>
              <Button type="button" disabled={busy} onClick={closeFolderPicker}>
                Cancel
              </Button>
            </div>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
