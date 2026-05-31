import { FIELD_DESCRIPTORS } from "./fields";
import type { FieldId, FieldMeta } from "./types";

export const FIELD_IDS: readonly FieldId[] = Object.freeze(
  Object.keys(FIELD_DESCRIPTORS) as FieldId[],
);

export const FIELD_META: Readonly<Record<FieldId, FieldMeta>> = Object.freeze(
  Object.fromEntries(
    FIELD_IDS.map((id) => {
      const d = FIELD_DESCRIPTORS[id];
      return [
        id,
        {
          id: d.id,
          type: d.type,
          label: d.label,
          group: d.group,
          ...(d.presets ? { presets: d.presets } : {}),
        },
      ];
    }),
  ) as Record<FieldId, FieldMeta>,
);
