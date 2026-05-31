import { Dialog, Input } from "@pond/ui";
import { useCallback, useEffect, useState } from "react";
import { categorize, useCategorize } from "@/lib/categorize";
import { setSaveTags } from "@/pool/mutate-save";
import { pool } from "@/pool/pool";
import styles from "./styles.module.css";

export function Categorize() {
  const { open, ids } = useCategorize();
  const [value, setValue] = useState("");

  useEffect(() => {
    if (!open) setValue("");
  }, [open]);

  const apply = useCallback(async () => {
    const tags = value
      .split(/[\s,]+/)
      .map((t) => t.replace(/^#+/, "").toLowerCase())
      .filter(Boolean);
    if (tags.length === 0) {
      categorize.close();
      return;
    }
    await Promise.all(
      ids.map((id) => {
        const save = pool.get(id);
        if (!save) return Promise.resolve();
        const merged = [...save.tags];
        for (const t of tags) {
          if (!merged.some((x) => x.toLowerCase() === t)) merged.push(t);
        }
        return setSaveTags(id, merged);
      }),
    );
    categorize.close();
  }, [value, ids]);

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) categorize.close();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop />
        <Dialog.Popup>
          <form
            className={styles.panel}
            onSubmit={(e) => {
              e.preventDefault();
              void apply();
            }}
          >
            <div className={styles.count}>
              {`Add tags to ${ids.length} item${ids.length === 1 ? "" : "s"}`}
            </div>
            <Input.Field
              autoFocus
              value={value}
              placeholder="tags, comma separated"
              autoComplete="off"
              spellCheck={false}
              onChange={(e) => setValue(e.target.value)}
            />
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
