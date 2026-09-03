import { COLOR_PRESETS } from "@pond/schema/filters/color";
import { FIELD_META } from "@pond/schema/filters/meta";
import type { FieldId, Predicate } from "@pond/schema/filters/types";
import { DATE_PRESETS } from "@/lib/search/syntax";

export interface FilterOption {
  label: string;
  predicate: Predicate;
  swatch?: string;
}

export const FILTER_GROUPS: readonly (readonly FieldId[])[] = [
  ["tags", "folder", "source", "list"],
  ["type", "color", "shape", "aspect", "duration", "fileCount", "rating"],
  ["fileSize", "width", "height"],
  ["savedAt", "modifiedAt", "publishedAt"],
  ["creator", "account", "note", "caption", "transcript", "comment", "url"],
];

export function fieldMatchesQuery(
  field: FieldId,
  query: string,
  options: readonly FilterOption[],
): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  if (FIELD_META[field].label.toLowerCase().includes(needle)) return true;
  return options.some((option) => option.label.toLowerCase().includes(needle));
}

export function choiceOptions(
  field: FieldId,
  choices: readonly { label: string; value: string }[],
): FilterOption[] {
  return choices.map(({ label, value }) => ({
    label,
    predicate: {
      field,
      operator: FIELD_META[field].type === "stringArray" ? "some" : "eq",
      value: FIELD_META[field].type === "stringArray" ? [value] : value,
    },
  }));
}

export function presetOptions(field: FieldId): FilterOption[] {
  const meta = FIELD_META[field];
  if (meta.type === "date") {
    return DATE_PRESETS.map(({ label, iso }) => ({
      label:
        iso === "-P1D"
          ? "Past 24 Hours"
          : label.replace(/\b\w/g, (c) => c.toUpperCase()),
      predicate: { field, operator: "gte", value: iso },
    }));
  }
  if (meta.type === "optional") {
    return [
      {
        label: `With ${meta.label}`,
        predicate: { field, operator: "exists", value: true },
      },
      {
        label: `Without ${meta.label}`,
        predicate: { field, operator: "exists", value: false },
      },
    ];
  }
  if (field === "color") {
    return COLOR_PRESETS.map(({ label, hex }) => ({
      label,
      swatch: hex,
      predicate: { field, operator: "near", value: hex },
    }));
  }
  if (field === "fileCount") {
    return [
      { label: "One File", predicate: { field, operator: "eq", value: 1 } },
      {
        label: "Multiple Files",
        predicate: { field, operator: "gt", value: 1 },
      },
    ];
  }
  if (field === "duration" || field === "fileSize") {
    return (meta.presets ?? []).map(({ id, label, value }) => ({
      label: label.replace(/\b[a-z]/g, (c) => c.toUpperCase()),
      predicate: {
        field,
        operator: id === "longer" || id === "large" ? "gte" : "lt",
        value,
      },
    }));
  }
  return (meta.presets ?? []).map(({ id, label, value }) => ({
    label: label.replace(/\b[a-z]/g, (c) => c.toUpperCase()),
    predicate: {
      field,
      operator: meta.type === "stringArray" ? "some" : "eq",
      value:
        meta.type === "stringArray"
          ? Array.isArray(value)
            ? value
            : typeof value === "string" || typeof value === "number"
              ? [value]
              : []
          : value,
    },
  }));
}
