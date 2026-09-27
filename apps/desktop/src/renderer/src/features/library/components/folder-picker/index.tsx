import { Button, Checkbox, Dialog, Input } from "@pond/ui";
import { useSelector } from "@tanstack/react-store";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  forgetRecentFolder,
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
import { SpecContextMenu } from "@/shared/components/spec-context-menu/spec-context-menu";
import { buildFolderPickerRowItems } from "./row-menu";
import styles from "./styles.module.css";

export function FolderPickerHost() {
  const ids = useSelector(folderPickerStore, (state) => state);
  return ids.length ? <FolderPicker ids={ids} key={ids.join("\n")} /> : null;
}
function FolderPicker({ ids }: { ids: readonly string[] }) {
  const controlId = useId();
  const rows = useFolders();
  const memberships = useFolderMemberships();
  const list = useRef<HTMLDivElement>(null);
  const searchField = useRef<HTMLInputElement>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [scope, setScope] = useState<"all" | "recent" | "selected">("all");
  const [search, setSearch] = useState("");
  const [changes, setChanges] = useState<Record<string, boolean>>({});
  const [recent, setRecent] = useState(readRecentFolderIds);
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
      .filter(
        (folder) =>
          scope === "all" ||
          (scope === "recent"
            ? recent.includes(folder.id)
            : (changes[folder.id] ??
              ids.some((id) => memberships[id]?.includes(folder.id)))),
      )
      .filter((folder) =>
        folder.label.toLowerCase().includes(search.toLowerCase()),
      )
      .sort(
        (a, b) =>
          (recent.includes(b.id) ? 1 : 0) - (recent.includes(a.id) ? 1 : 0) ||
          a.label.localeCompare(b.label),
      );
  }, [rows, search, recent, scope, changes, ids, memberships]);
  async function apply(next = changes) {
    if (busy || !Object.keys(next).length) return;
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
    if (busy || !search.trim()) return;
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
  function promptCreate(parentId: string | null) {
    if (busy) return;
    Dialog.prompt({
      title: parentId ? "New Subfolder" : "New Folder",
      placeholder: "Folder name",
      confirmLabel: "Create",
      onConfirm: async (name) => {
        const trimmed = name.trim();
        if (!trimmed) throw new Error("Enter a folder name.");
        await window.pond.query("folders.create", {
          name: trimmed,
          parentId,
        });
        await folders.refresh();
      },
    });
  }
  function navigate(event: React.KeyboardEvent, fromSearch = false) {
    if (event.nativeEvent.isComposing || busy) return;
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      void apply();
      return;
    }
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    if (fromSearch && (event.key === "Home" || event.key === "End")) return;
    event.preventDefault();
    const current = fromSearch
      ? -1
      : matches.findIndex((folder) => folder.id === cursor);
    if (current === 0 && event.key === "ArrowUp") {
      searchField.current?.focus();
      return;
    }
    const index =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? matches.length - 1
          : fromSearch && event.key === "ArrowUp"
            ? matches.length - 1
            : Math.max(
                0,
                Math.min(
                  matches.length - 1,
                  current + (event.key === "ArrowUp" ? -1 : 1),
                ),
              );
    const folder = matches[index];
    if (!folder) return;
    setCursor(folder.id);
    const control = list.current?.querySelector<HTMLElement>(
      `[data-folder-index="${index}"]`,
    );
    control?.focus();
    control?.scrollIntoView?.({ block: "nearest" });
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
                ref={searchField}
                onKeyDown={(event) => navigate(event, true)}
                autoFocus
                aria-label="Search folders"
                value={search}
                onValueChange={setSearch}
              />
            </Input.Root>
            <fieldset className={styles.scopes} aria-label="Show folders">
              {(["all", "recent", "selected"] as const).map((value) => (
                <Button
                  key={value}
                  type="button"
                  size="sm"
                  variant="ghost"
                  aria-pressed={scope === value}
                  onClick={() => setScope(value)}
                >
                  {value === "all"
                    ? "All"
                    : value === "recent"
                      ? "Recent"
                      : "Selected"}
                </Button>
              ))}
            </fieldset>
            <div ref={list} className={styles.list}>
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
                  <SpecContextMenu
                    key={folder.id}
                    buildItems={() =>
                      buildFolderPickerRowItems({
                        recent: recent.includes(folder.id),
                        onCreateSubfolder: () => promptCreate(folder.id),
                        onCreateBelow: () => promptCreate(folder.parentId),
                        onRemoveRecent: () => {
                          forgetRecentFolder(folder.id);
                          setRecent(readRecentFolderIds());
                        },
                      })
                    }
                  >
                    <div className={styles.row}>
                      <Checkbox.Root
                        id={`${controlId}-folder-${index}`}
                        data-folder-index={index}
                        onKeyDown={(event) => navigate(event)}
                        tabIndex={
                          (cursor ?? matches[0]?.id) === folder.id ? 0 : -1
                        }
                        onFocus={() => setCursor(folder.id)}
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
                      {recent.includes(folder.id) ? (
                        <small>Recent</small>
                      ) : null}
                    </div>
                  </SpecContextMenu>
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
            </div>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
