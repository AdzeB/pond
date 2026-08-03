import { FIELD_META } from "@pond/schema/filters/meta";
import type { FieldId, FieldMeta } from "@pond/schema/filters/types";
import { FIELD_HINTS } from "@/lib/search/fields";
import { canonicalKey, TOKEN_FIELDS } from "@/lib/search/syntax";

type FieldGroup = FieldMeta["group"];

const GROUP_ORDER: FieldGroup[] = ["content", "media", "time", "people"];
export const GROUP_LABELS: Record<FieldGroup, string> = {
  content: "Content",
  media: "Media",
  time: "Time",
  people: "People",
};

export interface FieldEntry {
  field: FieldId;
  key: string;
  label: string;
  hint: string;
}

export function buildGroups(): { group: FieldGroup; fields: FieldEntry[] }[] {
  const buckets = new Map<FieldGroup, FieldEntry[]>();
  for (const spec of TOKEN_FIELDS) {
    const meta = FIELD_META[spec.field];
    const entry: FieldEntry = {
      field: spec.field,
      key: canonicalKey(spec.field),
      label: meta.label,
      hint: FIELD_HINTS[spec.field] ?? "",
    };
    const list = buckets.get(meta.group) ?? [];
    list.push(entry);
    buckets.set(meta.group, list);
  }
  const ordered = [...buckets.keys()].sort(
    (a, b) => GROUP_ORDER.indexOf(a) - GROUP_ORDER.indexOf(b),
  );
  return ordered.map((group) => ({
    group,
    fields: buckets.get(group) ?? [],
  }));
}
