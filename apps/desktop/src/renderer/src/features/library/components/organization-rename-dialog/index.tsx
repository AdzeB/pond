import { Button, Checkbox, Dialog, Input } from "@pond/ui";
import { useId, useMemo, useState } from "react";
import { folders, useFolders } from "@/features/library/state/folders";
import {
  closeOrganizationRenameDialog,
  type OrganizationRenameKind,
  useOrganizationRenameDialog,
} from "@/features/library/state/organization-rename-dialog";
import {
  savedViews,
  useSavedViews,
} from "@/features/library/state/saved-views";
import { useRetainedDialogPayload } from "@/shared/hooks/use-retained-dialog-payload";
import { useScrollFade } from "@/shared/hooks/use-scroll-fade";
import { notify } from "@/shared/lib/toast";
import styles from "./styles.module.css";

export function OrganizationRenameDialogHost() {
  const state = useOrganizationRenameDialog();
  const presentation = useRetainedDialogPayload(state);
  return presentation.payload ? (
    <OrganizationRenameDialog
      key={presentation.payload.id}
      open={presentation.open}
      kind={presentation.payload.kind}
      initialId={presentation.payload.initialId}
    />
  ) : null;
}

function OrganizationRenameDialog({
  open,
  kind,
  initialId,
}: {
  open: boolean;
  kind: OrganizationRenameKind;
  initialId?: string;
}) {
  const folderRows = useFolders();
  const viewRows = useSavedViews();
  const rows = useMemo(
    () =>
      (kind === "folders" ? folderRows : viewRows).map((row) => ({
        id: row.id,
        name: row.name,
      })),
    [folderRows, kind, viewRows],
  );
  const [selected, setSelected] = useState(
    () => new Set(initialId ? [initialId] : []),
  );
  const [pattern, setPattern] = useState("{n:2} {title}");
  const [busy, setBusy] = useState(false);
  const templateId = useId();
  const scrollFade = useScrollFade<HTMLDivElement>();
  const title =
    kind === "folders" ? "Batch Rename Folders" : "Batch Rename Smart Folders";

  async function rename() {
    setBusy(true);
    try {
      const ids = [...selected];
      const result =
        kind === "folders"
          ? await window.pond.query("folders.renameBatch", { ids, pattern })
          : await window.pond.query("savedViews.renameBatch", {
              ids,
              pattern,
            });
      if (!result.ok) throw new Error(result.error ?? "Rename failed.");
      await (kind === "folders" ? folders.refresh() : savedViews.refresh());
      notify({
        id: "organization-rename",
        title: `${result.renamed} ${kind === "folders" ? "Folders" : "Smart Folders"} Renamed`,
      });
      closeOrganizationRenameDialog();
    } catch (error) {
      notify({
        id: "organization-rename",
        title: "Couldn’t Rename Items",
        description: error instanceof Error ? error.message : "Try again.",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(open) => {
        if (!open) closeOrganizationRenameDialog();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop />
        <Dialog.Popup className={styles.popup}>
          <Dialog.Header>
            <Dialog.Title>{title}</Dialog.Title>
            <Dialog.Close />
          </Dialog.Header>
          <Dialog.Description>
            Select items and apply one shared rename template.
          </Dialog.Description>
          <label htmlFor={templateId}>
            Template
            <Input.Field
              id={templateId}
              value={pattern}
              onValueChange={setPattern}
              placeholder="{n:2} {title}"
            />
          </label>
          <p className={styles.help}>
            Tokens: {"{n}"}, {"{title}"}, {"{id}"}, {"{date}"}, {"{original}"}
          </p>
          <div className={styles.actions}>
            <Button
              size="xs"
              variant="ghost"
              onClick={() => setSelected(new Set(rows.map((row) => row.id)))}
            >
              Select All
            </Button>
            <Button
              size="xs"
              variant="ghost"
              onClick={() => setSelected(new Set())}
            >
              Clear
            </Button>
          </div>
          <div className={styles.list} {...scrollFade}>
            {rows.map((row) => (
              <div key={row.id} className={styles.item}>
                <Checkbox.Root
                  aria-label={`Select ${row.name}`}
                  checked={selected.has(row.id)}
                  onCheckedChange={(checked) => {
                    setSelected((current) => {
                      const next = new Set(current);
                      if (checked === true) next.add(row.id);
                      else next.delete(row.id);
                      return next;
                    });
                  }}
                >
                  <Checkbox.Indicator />
                </Checkbox.Root>
                {row.name}
              </div>
            ))}
          </div>
          <Dialog.Footer>
            <Button variant="secondary" onClick={closeOrganizationRenameDialog}>
              Cancel
            </Button>
            <Button
              disabled={busy || selected.size === 0 || !pattern.trim()}
              onClick={() => void rename()}
            >
              Rename
            </Button>
          </Dialog.Footer>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
