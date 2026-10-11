import { FIELD_DESCRIPTORS } from "./fields";
import type { FieldId, FieldMeta } from "./types";

function isFieldId(value: string): value is FieldId {
  return value in FIELD_DESCRIPTORS;
}

const FIELD_ID_LIST = Object.keys(FIELD_DESCRIPTORS).filter(isFieldId);

export const FIELD_IDS: readonly FieldId[] = Object.freeze(FIELD_ID_LIST);

function metaFor(id: FieldId): FieldMeta {
  const d = FIELD_DESCRIPTORS[id];
  const meta: FieldMeta = {
    id: d.id,
    type: d.type,
    label: d.label,
    group: d.group,
  };
  if (d.presets) meta.presets = d.presets;
  return meta;
}

export const FIELD_META: Readonly<Record<FieldId, FieldMeta>> = Object.freeze(
  /** SAFETY: the keys come from FIELD_DESCRIPTORS itself, so every FieldId is present. */
  Object.fromEntries(FIELD_ID_LIST.map((id) => [id, metaFor(id)])) as Record<
    FieldId,
    FieldMeta
  >,
);
