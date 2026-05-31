import type { Query } from "@pond/schema/filters/types";
import { Button, cn, Dialog, Field, Input, useToast } from "@pond/ui";
import { useCallback, useEffect, useRef, useState } from "react";
import { makeSmartFolder } from "@/lib/smart-folders";
import { usePrefs } from "@/pool/prefs";
import styles from "./styles.module.css";

export function SaveSmartFolderDialog({
  query,
  open,
  onOpenChange,
}: {
  query: Query;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [smartFolders, patch] = usePrefs("smartFolders");
  const [name, setName] = useState("");
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setName("");
    const t = setTimeout(() => inputRef.current?.focus(), 30);
    return () => clearTimeout(t);
  }, [open]);

  const save = useCallback(() => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const items = smartFolders.items ?? [];
    const folder = makeSmartFolder(trimmed, query, items);
    patch({ items: [...items, folder] });
    toast.add({
      title: `Saved smart folder "${folder.name}"`,
      type: "success",
    });
    onOpenChange(false);
  }, [name, query, smartFolders.items, patch, toast, onOpenChange]);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop />
        <Dialog.Popup>
          <form
            className={cn(styles.form)}
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
          >
            <h2 className={styles.title}>Save smart folder</h2>
            <p className={styles.hint}>
              Save the current filter so you can reapply it from the sidebar.
            </p>
            <Field.Root>
              <Field.Label>Name</Field.Label>
              <Input.Field
                ref={inputRef}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Inspiration, To read, …"
                autoComplete="off"
                spellCheck={false}
              />
            </Field.Root>
            <div className={styles.actions}>
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" disabled={!name.trim()}>
                Save
              </Button>
            </div>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
