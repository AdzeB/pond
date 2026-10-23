import { FIELD_DESCRIPTORS } from "@pond/schema/filters/fields";
import type { FieldId } from "@pond/schema/filters/types";
import { useMemo } from "react";
import { useSavePaging, useSaves } from "@/features/saves/pool";
import { DATA_GATED_FIELDS } from "./options";

const GATED = Object.entries(DATA_GATED_FIELDS) as [FieldId, FieldId][];

function hasValue(value: unknown): boolean {
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
    const probes = new Set(GATED.map(([, probe]) => probe));
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
      (Object.keys(FIELD_DESCRIPTORS) as FieldId[]).filter(
        (field) => !(field in DATA_GATED_FIELDS),
      ),
    );
    for (const [field, probe] of GATED)
      if (found.has(probe)) present.add(field);
    return present;
  }, [enabled, hasMore, saves]);
}
