import { IconFolderFill, IconMagnifier } from "@pond/icons";
import { Checkbox } from "@pond/ui/checkbox";
import { Input } from "@pond/ui/input";
import { clsx as cn } from "clsx";
import { type ComponentPropsWithoutRef, useId, useMemo, useState } from "react";
import {
  type FolderRow,
  folderRows,
  searchFolders,
} from "@/utils/library-targets";
import type { Folder } from "@/utils/messaging";
import styles from "./styles.module.css";

const ROW_INSET = 8;
const DEPTH_INSET = 14;

const SWATCHES = new Set([
  "red",
  "orange",
  "yellow",
  "green",
  "teal",
  "blue",
  "purple",
  "pink",
]);

function folderColor(color: string | null): string | undefined {
  if (!color) return undefined;
  if (SWATCHES.has(color)) return `var(--ds-${color}-9)`;
  return /^#[\da-f]{3,8}$/i.test(color) ? color : undefined;
}

interface FoldersProps
  extends Omit<ComponentPropsWithoutRef<"div">, "onChange"> {
  folders: Folder[];
  recentIds: string[];
  value: string[];
  onValueChange: (value: string[]) => void;
}

export function Folders({
  folders,
  recentIds,
  value,
  onValueChange,
  className,
  ...props
}: FoldersProps) {
  const id = useId();
  const [query, setQuery] = useState("");
  const rows = useMemo(() => folderRows(folders), [folders]);
  const selected = new Set(value);
  const searching = query.trim().length > 0;
  const matches = searchFolders(rows, query);
  const byId = new Map(rows.map((row) => [row.folder.id, row]));
  const recent = searching
    ? []
    : recentIds.flatMap((folderId) => {
        const row = byId.get(folderId);
        return row ? [row] : [];
      });

  const toggle = (folderId: string, checked: boolean) =>
    onValueChange(
      checked
        ? [...value.filter((v) => v !== folderId), folderId]
        : value.filter((v) => v !== folderId),
    );

  const row = (entry: FolderRow, section: string, flat: boolean) => {
    const checkId = `${id}-${section}-${entry.folder.id}`;
    const checked = selected.has(entry.folder.id);
    return (
      <label
        key={checkId}
        htmlFor={checkId}
        className={styles.row}
        data-checked={checked || undefined}
        style={{
          paddingInlineStart:
            ROW_INSET + (flat ? 0 : entry.depth) * DEPTH_INSET,
        }}
      >
        <IconFolderFill
          size={14}
          className={styles.glyph}
          style={{ color: folderColor(entry.folder.color) }}
        />
        <span className={styles.label}>{entry.folder.name}</span>
        {flat && entry.path.length > 0 ? (
          <span className={styles.path}>{entry.path.join(" / ")}</span>
        ) : null}
        <Checkbox.Root
          id={checkId}
          size="sm"
          checked={checked}
          onCheckedChange={(next) => toggle(entry.folder.id, next)}
        >
          <Checkbox.Indicator />
        </Checkbox.Root>
      </label>
    );
  };

  return (
    <div className={cn(styles.folders, className)} {...props}>
      <Input.Root size="sm">
        <Input.Icon>
          <IconMagnifier size={12} />
        </Input.Icon>
        <Input.Field
          aria-label="Search folders"
          placeholder="Search folders…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            const first = matches[0];
            if (event.key !== "Enter" || !searching || !first) return;
            event.preventDefault();
            toggle(first.folder.id, !selected.has(first.folder.id));
          }}
        />
      </Input.Root>
      <fieldset className={styles.tree} aria-label="Folders">
        {recent.length > 0 ? (
          <>
            <div className={styles.heading}>Recent</div>
            {recent.map((entry) => row(entry, "recent", true))}
            <div className={styles.heading}>All Folders</div>
          </>
        ) : null}
        {matches.map((entry) => row(entry, "all", searching))}
        {matches.length === 0 ? (
          <p className={styles.none}>
            {folders.length === 0 ? "No folders yet" : "No folders found"}
          </p>
        ) : null}
      </fieldset>
    </div>
  );
}
