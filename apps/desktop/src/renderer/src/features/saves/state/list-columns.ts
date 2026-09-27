import { useSelector } from "@tanstack/react-store";
import { Store } from "@tanstack/store";

export type ListColumnKey =
  | "name"
  | "dateAdded"
  | "tags"
  | "dimensions"
  | "rating"
  | "extension"
  | "fileSize"
  | "annotation";

export interface ListColumns {
  name: boolean;
  dateAdded: boolean;
  tags: boolean;
  dimensions: boolean;
  rating: boolean;
  extension: boolean;
  fileSize: boolean;
  annotation: boolean;
}

export const LIST_COLUMN_OPTIONS: ReadonlyArray<{
  key: ListColumnKey;
  label: string;
}> = [
  { key: "name", label: "Name" },
  { key: "tags", label: "Tags" },
  { key: "dimensions", label: "Dimensions" },
  { key: "rating", label: "Rating" },
  { key: "extension", label: "Extension" },
  { key: "fileSize", label: "File Size" },
  { key: "dateAdded", label: "Date Added" },
  { key: "annotation", label: "Annotation" },
];

export const LIST_COLUMN_DEFAULTS: ListColumns = {
  name: true,
  dateAdded: true,
  tags: false,
  dimensions: false,
  rating: false,
  extension: false,
  fileSize: false,
  annotation: false,
};

const STORAGE_KEYS = {
  name: "pond.list.name",
  dateAdded: "pond.list.dateAdded",
  tags: "pond.list.tags",
  dimensions: "pond.list.dimensions",
  rating: "pond.list.rating",
  extension: "pond.list.extension",
  fileSize: "pond.list.fileSize",
  annotation: "pond.list.annotation",
} satisfies Record<ListColumnKey, string>;

function readKey(key: ListColumnKey): boolean {
  if (!globalThis.window) return LIST_COLUMN_DEFAULTS[key];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS[key]);
    if (raw == null) return LIST_COLUMN_DEFAULTS[key];
    return raw === "1";
  } catch {
    return LIST_COLUMN_DEFAULTS[key];
  }
}

function readAll(): ListColumns {
  return {
    name: readKey("name"),
    dateAdded: readKey("dateAdded"),
    tags: readKey("tags"),
    dimensions: readKey("dimensions"),
    rating: readKey("rating"),
    extension: readKey("extension"),
    fileSize: readKey("fileSize"),
    annotation: readKey("annotation"),
  };
}

const store = new Store<ListColumns>(readAll());

export function setListColumn(key: ListColumnKey, value: boolean): void {
  if (globalThis.window) {
    try {
      window.localStorage.setItem(STORAGE_KEYS[key], value ? "1" : "0");
    } catch {}
  }
  store.setState((s) => (s[key] === value ? s : { ...s, [key]: value }));
}

export function useListColumns(): ListColumns {
  return useSelector(store, (s) => s);
}

export function formatListDimension(
  width: number | null | undefined,
  height: number | null | undefined,
): string {
  if (!width || !height) return "—";
  return `${width} × ${height}`;
}

export function formatListRating(rating: number | null | undefined): string {
  if (rating == null || rating <= 0) return "—";
  return String(rating);
}

export function formatListExtension(path: string | null | undefined): string {
  if (!path) return "—";
  const dot = path.lastIndexOf(".");
  if (dot < 0) return "—";
  return path.slice(dot + 1).toUpperCase();
}
