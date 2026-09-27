import { Button, Dialog, Input } from "@pond/ui";
import { useId, useState } from "react";
import { closeRenameDialog } from "@/features/library/state/rename-dialog";
import { reloadSaves } from "@/features/saves/lib/ensure-saves";
import styles from "./styles.module.css";

export function RenameDialog({
  ids,
  open,
}: {
  ids: readonly string[];
  open: boolean;
}) {
  const fieldId = useId();
  const [pattern, setPattern] = useState("{title} {n}");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function rename() {
    const normalized = pattern.trim();
    if (!normalized) return;
    setBusy(true);
    setError(null);
    try {
      const result = await window.pond.query("saves.batchRename", {
        ids: [...ids],
        pattern: normalized,
      });
      if (!result.ok) throw new Error("Enter a name pattern and try again.");
      await reloadSaves(ids);
      closeRenameDialog();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not rename the saves.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !busy) closeRenameDialog();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop />
        <Dialog.Popup className={styles.popup}>
          <Dialog.Header>
            <Dialog.Title>Rename Saves</Dialog.Title>
            <Dialog.Close disabled={busy} />
          </Dialog.Header>
          <Dialog.Description>{`Rename ${ids.length} ${ids.length === 1 ? "save" : "saves"} with one pattern.`}</Dialog.Description>
          <fieldset disabled={busy} className={styles.editor}>
            <label htmlFor={`${fieldId}-pattern`}>
              Name Pattern
              <Input.Root>
                <Input.Field
                  id={`${fieldId}-pattern`}
                  value={pattern}
                  onValueChange={setPattern}
                />
              </Input.Root>
            </label>
            <p>
              Use {"{title}"}, {"{n}"}, {"{date}"}, {"{tags}"}, {"{original}"},
              or {"{id}"}. Add digits inside a number token, such as {"{n:3}"}.
            </p>
          </fieldset>
          {error ? <p role="alert">{error}</p> : null}
          <div className={styles.footer}>
            <Button
              variant="secondary"
              disabled={busy}
              onClick={closeRenameDialog}
            >
              Cancel
            </Button>
            <Button
              disabled={busy || !pattern.trim()}
              onClick={() => void rename()}
            >
              {busy ? "Renaming" : "Rename"}
            </Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
