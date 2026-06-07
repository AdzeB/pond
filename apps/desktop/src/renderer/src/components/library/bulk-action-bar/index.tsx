import { normalizeLabelName } from "@pond/schema/label-name";
import { Button, cn, Tooltip, useToast } from "@pond/ui";
import { useCallback, useState } from "react";
import { BulkTagsCombobox } from "@/components/comboboxes/bulk-tags";
import { setSaveTags, trashSaves } from "@/pool/mutate-save";
import { pool } from "@/pool/pool";
import { selection, useSelectedIds, useSelectionSize } from "@/pool/selection";
import styles from "./styles.module.css";

function Root() {
  const size = useSelectionSize();
  const ids = useSelectedIds();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const close = useCallback(() => selection.clear(), []);

  const addTag = useCallback(
    async (raw: string) => {
      const cleaned = normalizeLabelName(raw);
      if (!cleaned || ids.length === 0) return;
      const lowered = cleaned.toLowerCase();
      setBusy(true);
      try {
        const targets = ids.filter((id) => {
          const save = pool.get(id);
          return save && !save.tags.some((t) => t.toLowerCase() === lowered);
        });
        await Promise.all(
          targets.map((id) => {
            const save = pool.get(id);
            if (!save) return Promise.resolve();
            return setSaveTags(id, [...save.tags, cleaned]);
          }),
        );
        toast.add({
          title: `Added "${cleaned}" to ${targets.length} save${targets.length === 1 ? "" : "s"}`,
          type: "success",
        });
      } finally {
        setBusy(false);
      }
    },
    [ids, toast],
  );

  const exportFiles = useCallback(async () => {
    if (ids.length === 0) return;
    setBusy(true);
    try {
      const res = (await window.pond.query("saves.exportFiles", { ids })) as {
        ok: boolean;
        exported?: number;
      };
      if (res.ok) {
        const n = res.exported ?? 0;
        toast.add({
          title: `Exported ${n} file${n === 1 ? "" : "s"}`,
          type: "success",
        });
      }
    } finally {
      setBusy(false);
    }
  }, [ids, toast]);

  const exportCsv = useCallback(async () => {
    setBusy(true);
    try {
      const res = (await window.pond.query("saves.exportCsv", { ids })) as {
        ok: boolean;
        count?: number;
      };
      if (res.ok) {
        const n = res.count ?? 0;
        toast.add({
          title: `Exported ${n} row${n === 1 ? "" : "s"} to CSV`,
          type: "success",
        });
      }
    } finally {
      setBusy(false);
    }
  }, [ids, toast]);

  const trash = useCallback(async () => {
    if (ids.length === 0) return;
    setBusy(true);
    try {
      const n = await trashSaves(ids, { actorReason: "bulk-trash" });
      toast.add({
        title: `Moved ${n} save${n === 1 ? "" : "s"} to trash`,
        type: "success",
      });
      selection.clear();
    } finally {
      setBusy(false);
    }
  }, [ids, toast]);

  if (size === 0) return null;

  return (
    <Bar>
      <Count>{size} selected</Count>
      <Divider />
      <BulkTagsCombobox onPick={(name) => void addTag(name)} disabled={busy} />
      <Tooltip label="Copy each selected file into a folder">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => void exportFiles()}
          disabled={busy}
        >
          Export files
        </Button>
      </Tooltip>
      <Tooltip label="Export selected saves as a CSV catalog">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => void exportCsv()}
          disabled={busy}
        >
          Export CSV
        </Button>
      </Tooltip>
      <Tooltip label="Move every selected save to trash">
        <Button
          size="sm"
          variant="danger"
          onClick={() => void trash()}
          disabled={busy}
        >
          Trash
        </Button>
      </Tooltip>
      <Divider />
      <Tooltip label="Clear selection (Esc)">
        <Button size="sm" variant="ghost" onClick={close} disabled={busy}>
          Done
        </Button>
      </Tooltip>
    </Bar>
  );
}

interface BarProps extends React.ComponentPropsWithoutRef<"div"> {}

function Bar({ className, ...props }: BarProps) {
  return (
    <div
      role="toolbar"
      aria-label="Bulk actions"
      className={cn(styles.bar, className)}
      {...props}
    />
  );
}

interface CountProps extends React.ComponentPropsWithoutRef<"span"> {}

function Count({ className, ...props }: CountProps) {
  return <span className={cn(styles.count, className)} {...props} />;
}

interface DividerProps extends React.ComponentPropsWithoutRef<"div"> {}

function Divider({ className, ...props }: DividerProps) {
  return (
    <div aria-hidden className={cn(styles.divider, className)} {...props} />
  );
}

export const BulkActionBar = {
  Root,
  Bar,
  Count,
  Divider,
};
