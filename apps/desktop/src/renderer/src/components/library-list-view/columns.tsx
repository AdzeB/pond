import {
  createColumnHelper,
  type RowData,
  type SortingFn,
} from "@tanstack/react-table";
import { CardThumb } from "@/components/save-card-thumb";
import { formatAbsolute, formatBytes } from "@/lib/format";
import type { Save } from "@/lib/types";
import styles from "./styles.module.css";

declare module "@tanstack/react-table" {
  interface ColumnMeta<TData extends RowData, TValue> {
    className?: string;
  }
}

export type SortKey =
  | "title"
  | "tags"
  | "dimensions"
  | "extension"
  | "fileSize"
  | "savedAt";

export const SORT_KEYS = new Set<SortKey>([
  "title",
  "tags",
  "dimensions",
  "extension",
  "fileSize",
  "savedAt",
]);

// Locale-aware comparator; TanStack's `text` fn uses chunked alphanumeric comparison that diverges from localeCompare.
const localeSort: SortingFn<Save> = (a, b, columnId) => {
  const va = a.getValue<string>(columnId);
  const vb = b.getValue<string>(columnId);
  return va.localeCompare(vb);
};

function extensionFor(save: Save): string {
  const cover = save.files[save.coverIndex ?? 0];
  if (cover?.path) {
    const m = /\.([a-z0-9]+)$/i.exec(cover.path);
    if (m?.[1]) return m[1].toLowerCase();
  }
  if (cover?.mimeType) {
    const m = /^[^/]+\/(.+)$/.exec(cover.mimeType);
    if (m?.[1]) return m[1].toLowerCase();
  }
  return "";
}

export function buildColumns() {
  const helper = createColumnHelper<Save>();
  return [
    helper.display({
      id: "thumbnail",
      header: () => null,
      cell: ({ row }) => (
        <span className={styles["list-thumb"]}>
          <CardThumb save={row.original} />
        </span>
      ),
      enableSorting: false,
      meta: { className: styles["col-thumb"] },
    }),
    helper.accessor((save) => (save.title ?? save.url ?? "").toLowerCase(), {
      id: "title",
      header: "Name",
      cell: ({ row }) => row.original.title ?? row.original.url,
      sortingFn: localeSort,
      sortDescFirst: false,
      meta: { className: styles["col-name"] },
    }),
    helper.accessor((save) => save.tags.join(",").toLowerCase(), {
      id: "tags",
      header: "Tags",
      cell: ({ row }) => {
        const save = row.original;
        if (save.tags.length === 0) {
          return <span className={styles["col-muted"]}>-</span>;
        }
        return (
          <span className={styles["tag-chips"]}>
            {save.tags.slice(0, 6).map((t) => (
              <span key={t} className={styles["tag-chip"]}>
                {t}
              </span>
            ))}
            {save.tags.length > 6 ? (
              <span className={styles["tag-chip-more"]}>
                +{save.tags.length - 6}
              </span>
            ) : null}
          </span>
        );
      },
      sortingFn: localeSort,
      sortDescFirst: false,
      meta: { className: styles["col-tags"] },
    }),
    helper.accessor(
      (save) => {
        const cover = save.files[save.coverIndex ?? 0];
        const w = cover?.width ?? save.width ?? null;
        const h = cover?.height ?? save.height ?? null;
        return w && h ? w * h : undefined;
      },
      {
        id: "dimensions",
        header: "Dimensions",
        cell: ({ row }) => {
          const save = row.original;
          const cover = save.files[save.coverIndex ?? 0];
          if (cover?.width && cover?.height) {
            return `${cover.width} × ${cover.height}`;
          }
          if (save.width && save.height) {
            return `${save.width} × ${save.height}`;
          }
          return "-";
        },
        sortingFn: "basic",
        sortUndefined: "last",
        sortDescFirst: false,
        meta: { className: styles["col-dim"] },
      },
    ),
    helper.accessor((save) => extensionFor(save), {
      id: "extension",
      header: "Extension",
      cell: ({ row }) => {
        const ext = extensionFor(row.original).toUpperCase();
        return ext ? <span className={styles["ext-chip"]}>{ext}</span> : "-";
      },
      sortingFn: localeSort,
      sortDescFirst: false,
      meta: { className: styles["col-ext"] },
    }),
    helper.accessor(
      (save) => {
        const cover = save.files[save.coverIndex ?? 0];
        const v = cover?.size ?? save.fileSize ?? null;
        return v == null ? undefined : v;
      },
      {
        id: "fileSize",
        header: "File Size",
        cell: ({ row }) => {
          const save = row.original;
          const cover = save.files[save.coverIndex ?? 0];
          return formatBytes(cover?.size ?? save.fileSize ?? null);
        },
        sortingFn: "basic",
        sortUndefined: "last",
        sortDescFirst: true,
        meta: { className: styles["col-size"] },
      },
    ),
    helper.accessor(
      (save) => {
        const t = new Date(save.savedAt).getTime();
        return Number.isFinite(t) ? t : undefined;
      },
      {
        id: "savedAt",
        header: "Date Added",
        cell: ({ row }) => formatAbsolute(row.original.savedAt),
        sortingFn: "basic",
        sortUndefined: "last",
        sortDescFirst: true,
        meta: { className: styles["col-date"] },
      },
    ),
  ];
}
