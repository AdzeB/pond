import { FIELD_META } from "@pond/schema/filters/meta";
import type { FieldId } from "@pond/schema/filters/types";
import { useSelector } from "@tanstack/react-store";
import { Store } from "@tanstack/store";
import { readViewPref, writeViewPref } from "@/lib/ui/view-prefs";

export type OverlayId = "semantic" | "visual";

export const DEFAULT_FILTER_FIELDS: readonly FieldId[] = [
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

function readPinnedFields(): FieldId[] {
  try {
    const saved: unknown = JSON.parse(readViewPref("filterFields") ?? "null");
    if (Array.isArray(saved)) {
      return [
        ...new Set(
          saved.filter(
            (field): field is FieldId =>
              typeof field === "string" && Object.hasOwn(FIELD_META, field),
          ),
        ),
      ];
    }
  } catch {}
  return [...DEFAULT_FILTER_FIELDS];
}

function readPinnedOverlays(): OverlayId[] {
  try {
    const saved: unknown = JSON.parse(readViewPref("filterOverlays") ?? "null");
    if (Array.isArray(saved)) {
      return [
        ...new Set(
          saved.filter(
            (value): value is OverlayId =>
              value === "semantic" || value === "visual",
          ),
        ),
      ];
    }
  } catch {}
  return [];
}

const store = new Store({
  open: readViewPref("filters") !== "0",
  pinned: readPinnedFields(),
  overlays: readPinnedOverlays(),
});

export const filterToolbar = {
  setOpen(open: boolean): void {
    writeViewPref("filters", open ? "1" : "0");
    store.setState((state) => ({ ...state, open }));
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
    writeViewPref("filterFields", JSON.stringify(pinned));
    writeViewPref("filterOverlays", JSON.stringify([]));
    store.setState((state) => ({ ...state, pinned, overlays: [] }));
  },
};

export function useFilterToolbar() {
  return useSelector(store, (state) => state);
}
