import { FIELD_META } from "@pond/schema/filters/meta";
import type { FieldId } from "@pond/schema/filters/types";
import { useSelector } from "@tanstack/react-store";
import { Store } from "@tanstack/store";
import { z } from "zod";
import { readViewPref, writeViewPref } from "@/features/library/lib/view-prefs";

const OverlayIdSchema = z.enum(["semantic", "visual"]);

export type OverlayId = z.infer<typeof OverlayIdSchema>;

const DEFAULT_FILTER_FIELDS: readonly FieldId[] = [
  "color",
  "tags",
  "folder",
  "shape",
  "rating",
  "type",
  "format",
  "width",
  "duration",
  "fileSize",
  "note",
  "url",
  "savedAt",
  "modifiedAt",
];

const DEFAULT_FILTER_OVERLAYS: readonly OverlayId[] = ["visual", "semantic"];

const STOCK_FILTER_FIELDS_TO_REPLACE: readonly FieldId[] = [
  "color",
  "tags",
  "folder",
  "source",
  "type",
  "shape",
  "aspect",
  "duration",
  "fileCount",
  "note",
  "savedAt",
  "modifiedAt",
];

const PREVIOUS_DEFAULT_FILTER_FIELDS: readonly FieldId[] = [
  "color",
  "tags",
  "folder",
  "shape",
  "rating",
  "type",
  "width",
  "height",
  "duration",
  "fileSize",
  "note",
  "url",
  "savedAt",
  "modifiedAt",
];

function sameIds(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((id, i) => id === right[i]);
}

const StoredList = z.array(z.json());
const Field = z.custom<FieldId>(
  (value) =>
    z.string().safeParse(value).success &&
    Object.hasOwn(FIELD_META, String(value)),
);

function parseList<T>(text: string | null, item: z.ZodType<T>): T[] | null {
  const saved = StoredList.safeParse(JSON.parse(text ?? "null"));
  if (!saved.success) return null;
  return [
    ...new Set(
      saved.data.flatMap((value) => {
        const parsed = item.safeParse(value);
        return parsed.success ? [parsed.data] : [];
      }),
    ),
  ];
}

function parseFields(text: string | null): FieldId[] | null {
  return parseList(text, Field);
}

function readPinnedFields(): FieldId[] {
  try {
    const fields = parseFields(readViewPref("filterFields"));
    if (fields) {
      if (
        sameIds(fields, STOCK_FILTER_FIELDS_TO_REPLACE) ||
        sameIds(fields, PREVIOUS_DEFAULT_FILTER_FIELDS)
      ) {
        return [...DEFAULT_FILTER_FIELDS];
      }
      return fields;
    }
  } catch {}
  return [...DEFAULT_FILTER_FIELDS];
}

function readPinnedOverlays(): OverlayId[] {
  try {
    const overlays = parseList(readViewPref("filterOverlays"), OverlayIdSchema);
    const stockPins = sameIds(
      parseFields(readViewPref("filterFields")) ?? [],
      STOCK_FILTER_FIELDS_TO_REPLACE,
    );
    if (overlays) {
      if (overlays.length === 0 && stockPins) {
        return [...DEFAULT_FILTER_OVERLAYS];
      }
      return overlays;
    }
  } catch {}
  return [...DEFAULT_FILTER_OVERLAYS];
}

const store = new Store({
  open: readViewPref("filters") !== "0",
  pinned: readPinnedFields(),
  overlays: readPinnedOverlays(),
});

export const filterToolbar = {
  isOpen(): boolean {
    return store.state.open;
  },
  setOpen(open: boolean): void {
    writeViewPref("filters", open ? "1" : "0");
    store.setState((state) => ({ ...state, open }));
  },
  toggle(): void {
    filterToolbar.setOpen(!store.state.open);
  },
  setPinned(field: FieldId, pinned: boolean): void {
    const fields = store.state.pinned.filter((value) => value !== field);
    if (pinned) fields.push(field);
    writeViewPref("filterFields", JSON.stringify(fields));
    store.setState((state) => ({ ...state, pinned: fields }));
  },
  setOverlayPinned(overlay: OverlayId, pinned: boolean): void {
    const overlays = store.state.overlays.filter((value) => value !== overlay);
    if (pinned) overlays.push(overlay);
    writeViewPref("filterOverlays", JSON.stringify(overlays));
    store.setState((state) => ({ ...state, overlays }));
  },
  restoreDefaults(): void {
    const pinned = [...DEFAULT_FILTER_FIELDS];
    const overlays = [...DEFAULT_FILTER_OVERLAYS];
    writeViewPref("filterFields", JSON.stringify(pinned));
    writeViewPref("filterOverlays", JSON.stringify(overlays));
    store.setState((state) => ({ ...state, pinned, overlays }));
  },
};

export function useFilterToolbar() {
  return useSelector(store, (state) => state);
}
