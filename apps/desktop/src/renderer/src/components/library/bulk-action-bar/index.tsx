import { normalizeLabelName } from "@pond/schema/label-name";
import { Button, cn, Input, Popover, Tooltip, useToast } from "@pond/ui";
import { useCallback, useMemo, useState } from "react";
import { setSaveTags, trashSaves } from "@/pool/mutate-save";
import { pool } from "@/pool/pool";
import { selection, useSelectedIds, useSelectionSize } from "@/pool/selection";
import { useTags } from "@/pool/tags";
import styles from "./styles.module.css";

function Root() {
  const size = useSelectionSize();
  const ids = useSelectedIds();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

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
        setOpen(false);
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
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger
          render={
            <Button size="sm" disabled={busy}>
              Add tag…
            </Button>
          }
        />
        <Popover.Portal>
          <Popover.Positioner sideOffset={6} align="start">
            <Popover.Popup className={styles["bulk-tag-popup"]}>
              <BulkTagPicker
                onPick={(name) => void addTag(name)}
                disabled={busy}
              />
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
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

function BulkTagPicker({
  onPick,
  disabled,
}: {
  onPick: (name: string) => void;
  disabled: boolean;
}) {
  const [q, setQ] = useState("");
  const tags = useTags();
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = needle
      ? tags.filter((t) => t.name.toLowerCase().includes(needle))
      : tags;
    return list
      .slice()
      .sort(
        (a, b) =>
          Number(b.starred) - Number(a.starred) || a.name.localeCompare(b.name),
      )
      .slice(0, 20);
  }, [q, tags]);
  const needle = q.trim();
  const exact =
    needle && tags.some((t) => t.name.toLowerCase() === needle.toLowerCase());
  return (
    <div className={styles["bulk-tag-body"]}>
      <Input.Field
        autoFocus
        data-size="sm"
        placeholder="Add tag…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            const target = filtered[0]?.name ?? q;
            if (target.trim()) onPick(target);
          }
        }}
        disabled={disabled}
      />
      <div className={styles["bulk-tag-list"]}>
        {filtered.map((t) => (
          <button
            key={t.name}
            type="button"
            className={styles["bulk-tag-item"]}
            onClick={() => onPick(t.name)}
          >
            <span>{t.name}</span>
          </button>
        ))}
        {needle && !exact ? (
          <button
            type="button"
            className={styles["bulk-tag-item"]}
            data-create
            onClick={() => onPick(q)}
          >
            Create "{normalizeLabelName(q) || q}"
          </button>
        ) : null}
      </div>
    </div>
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
