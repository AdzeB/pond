import { Button, Checkbox, Dialog, Input, Select } from "@pond/ui";
import { useEffect, useId, useMemo, useState } from "react";
import { folders, useFolders } from "@/features/library/state/folders";
import { useTags } from "@/features/tags/state/tags";
import styles from "./styles.module.css";

export type FolderTool = {
  kind: "tags" | "create" | "move";
  id: string;
  name: string;
};
export function FolderToolsDialog({
  tool,
  onClose,
}: {
  tool: FolderTool;
  onClose: () => void;
}) {
  const controlId = useId();
  const all = useFolders();
  const registry = useTags();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>(
    tool.kind === "move" ? [tool.id] : [],
  );
  const [inherited, setInherited] = useState<string[]>([]);
  const [names, setNames] = useState("");
  const [parent, setParent] = useState(tool.kind === "create" ? tool.id : "");
  const [applyExisting, setApplyExisting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(tool.kind === "tags");
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (tool.kind !== "tags") return;
    let active = true;
    void window.pond
      .query("folders.rules.get", { id: tool.id })
      .then((result) => {
        if (!active) return;
        setSelected(result.tags);
        setInherited(result.inheritedTags);
        setLoading(false);
      })
      .catch(() => {
        if (active) {
          setError(
            "Couldn't load automatic tags. Close this dialog and try again.",
          );
        }
      });
    return () => {
      active = false;
    };
  }, [tool.id, tool.kind]);
  const folderOptions = useMemo(() => {
    const byId = new Map(all.map((folder) => [folder.id, folder]));
    return all
      .map((folder) => {
        const path = [folder.name];
        const seen = new Set([folder.id]);
        let current = folder.parentId;
        while (current && !seen.has(current)) {
          seen.add(current);
          const ancestor = byId.get(current);
          if (!ancestor) break;
          path.unshift(ancestor.name);
          current = ancestor.parentId;
        }
        return { id: folder.id, name: path.join(" / ") };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [all]);
  const tagNames = [
    ...new Set([...registry.map((tag) => tag.name), ...selected]),
  ].sort((a, b) => a.localeCompare(b));
  function toggle(id: string) {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }
  async function submit() {
    setBusy(true);
    setError(null);
    try {
      if (tool.kind === "tags")
        await window.pond.query("folders.rules.set", {
          id: tool.id,
          tags: selected,
          applyExisting,
        });
      else if (tool.kind === "create")
        await window.pond.query("folders.createBatch", {
          names: names
            .split("\n")
            .map((name) => name.trim())
            .filter(Boolean),
          parentId: parent || null,
        });
      else
        await window.pond.query("folders.moveBatch", {
          ids: selected,
          parentId: parent || null,
        });
      await folders.refresh();
      onClose();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Couldn't update folders.",
      );
    } finally {
      setBusy(false);
    }
  }
  const title =
    tool.kind === "tags"
      ? "Automatic Tags"
      : tool.kind === "create"
        ? "Create Folders"
        : "Move Folders";
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
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void submit();
            }}
          >
            <Dialog.Header>
              <Dialog.Title>{title}</Dialog.Title>
              <Dialog.Close disabled={busy} />
            </Dialog.Header>
            <Dialog.Description>
              {tool.kind === "tags"
                ? `Add these tags when Saves enter ${tool.name} or its subfolders. Removing a Save from a folder keeps its tags.`
                : tool.kind === "create"
                  ? "Enter one folder name per line."
                  : "Choose folders and their destination. Selected subfolders stay inside their selected parent."}
            </Dialog.Description>
            {tool.kind === "tags" ? (
              <>
                {inherited.length ? (
                  <p className={styles.hint}>
                    Inherited from parent folders: {inherited.join(", ")}
                  </p>
                ) : null}
                <Input.Root>
                  <Input.Field
                    aria-label="Search or add tags"
                    value={search}
                    onValueChange={setSearch}
                  />
                </Input.Root>
                <div className={styles.list}>
                  {tagNames
                    .filter((name) =>
                      name.toLowerCase().includes(search.toLowerCase()),
                    )
                    .map((name, index) => (
                      <div key={name} className={styles.row}>
                        <Checkbox.Root
                          id={`${controlId}-tag-${index}`}
                          aria-label={name}
                          disabled={busy || loading}
                          checked={selected.includes(name)}
                          onCheckedChange={() => toggle(name)}
                        >
                          <Checkbox.Indicator />
                        </Checkbox.Root>
                        <label htmlFor={`${controlId}-tag-${index}`}>
                          {name}
                        </label>
                      </div>
                    ))}
                </div>
                {search.trim() &&
                !tagNames.some(
                  (name) => name.toLowerCase() === search.trim().toLowerCase(),
                ) ? (
                  <Button
                    type="button"
                    disabled={busy || loading}
                    onClick={() => {
                      setSelected((current) => [...current, search.trim()]);
                      setSearch("");
                    }}
                  >
                    Add “{search.trim()}”
                  </Button>
                ) : null}
                <div className={styles.row}>
                  <Checkbox.Root
                    id={`${controlId}-existing`}
                    aria-label="Apply to Saves already in this folder and its subfolders"
                    checked={applyExisting}
                    onCheckedChange={setApplyExisting}
                    disabled={busy || loading}
                  >
                    <Checkbox.Indicator />
                  </Checkbox.Root>
                  <label htmlFor={`${controlId}-existing`}>
                    Apply to Saves already in this folder and its subfolders
                  </label>
                </div>
              </>
            ) : (
              <>
                <Select.Root
                  value={parent}
                  items={[
                    { value: "", label: "Folders" },
                    ...folderOptions.map((folder) => ({
                      value: folder.id,
                      label: folder.name,
                    })),
                  ]}
                  disabled={busy}
                  onValueChange={(value) => {
                    if (value !== null) setParent(value);
                  }}
                >
                  <div className={styles.label}>
                    <Select.Label>Destination</Select.Label>
                    <Select.Trigger
                      width="full"
                      aria-label="Destination folder"
                    >
                      <Select.Value />
                    </Select.Trigger>
                  </div>
                  <Select.Portal>
                    <Select.Positioner>
                      <Select.Popup>
                        <Select.Items
                          items={[
                            { value: "", label: "Folders" },
                            ...folderOptions.map((folder) => ({
                              value: folder.id,
                              label: folder.name,
                            })),
                          ]}
                        />
                      </Select.Popup>
                    </Select.Positioner>
                  </Select.Portal>
                </Select.Root>
                {tool.kind === "create" ? (
                  <Input.Root className={styles.names}>
                    <Input.Textarea
                      aria-label="Folder names, one per line"
                      rows={8}
                      value={names}
                      onValueChange={setNames}
                      disabled={busy}
                    />
                  </Input.Root>
                ) : (
                  <>
                    <Input.Root>
                      <Input.Field
                        aria-label="Search folders to move"
                        value={search}
                        onValueChange={setSearch}
                      />
                    </Input.Root>
                    <div className={styles.list}>
                      {folderOptions
                        .filter((folder) =>
                          folder.name
                            .toLowerCase()
                            .includes(search.toLowerCase()),
                        )
                        .map((folder, index) => (
                          <div key={folder.id} className={styles.row}>
                            <Checkbox.Root
                              id={`${controlId}-folder-${index}`}
                              aria-label={folder.name}
                              checked={selected.includes(folder.id)}
                              onCheckedChange={() => toggle(folder.id)}
                              disabled={busy}
                            >
                              <Checkbox.Indicator />
                            </Checkbox.Root>
                            <label htmlFor={`${controlId}-folder-${index}`}>
                              {folder.name}
                            </label>
                          </div>
                        ))}
                    </div>
                  </>
                )}
              </>
            )}
            {error ? <p role="alert">{error}</p> : null}
            <div className={styles.footer}>
              <Button type="button" disabled={busy} onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  busy ||
                  loading ||
                  (tool.kind === "create" && !names.trim()) ||
                  (tool.kind === "move" && !selected.length)
                }
                loading={busy}
              >
                {busy
                  ? "Saving"
                  : tool.kind === "create"
                    ? "Create"
                    : tool.kind === "move"
                      ? "Move"
                      : "Save"}
              </Button>
            </div>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
