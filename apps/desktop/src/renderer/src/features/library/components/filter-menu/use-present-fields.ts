import { FIELD_DESCRIPTORS } from "@pond/schema/filters/fields";
import { FIELD_IDS } from "@pond/schema/filters/meta";
import type { FieldId } from "@pond/schema/filters/types";
import { useMemo } from "react";
import { useSavePaging, useSaves } from "@/features/saves/pool";
import { DATA_GATED_FIELDS } from "./options";

type FieldValue = ReturnType<(typeof FIELD_DESCRIPTORS)[FieldId]["project"]>;

function hasValue(value: FieldValue): boolean {
  if (Array.isArray(value)) return value.length > 0;
  return value != null && value !== "" && value !== false;
}

/** Null until the whole library is in memory, so a half-loaded pool never hides a field. */
export function usePresentFields(
  enabled: boolean,
): ReadonlySet<FieldId> | null {
  const saves = useSaves();
  const { hasMore } = useSavePaging();
  return useMemo(() => {
    if (!enabled || hasMore) return null;
    const probes = new Set(DATA_GATED_FIELDS.values());
    const found = new Set<FieldId>();
    for (const save of saves) {
      if (found.size === probes.size) break;
      const record = { ...save, folderIds: [] };
      for (const probe of probes) {
        if (
          !found.has(probe) &&
          hasValue(FIELD_DESCRIPTORS[probe].project(record))
        ) {
          found.add(probe);
        }
      }
    }
    const present = new Set<FieldId>(
      FIELD_IDS.filter((field) => !DATA_GATED_FIELDS.has(field)),
    );
    for (const [field, probe] of DATA_GATED_FIELDS)
      if (found.has(probe)) present.add(field);
    return present;
  }, [enabled, hasMore, saves]);
}
