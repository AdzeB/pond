import { FIELD_DESCRIPTORS } from "@pond/schema/filters";
import type { FieldId } from "@pond/schema/filters/types";
import { useMemo } from "react";
import { useSaves } from "./use-saves";

// Count complete, non-deleted saves per distinct field value, using the predicate's projection so counts match results.
export function useFieldValueCounts(
  field: FieldId,
): ReadonlyMap<string, number> {
  const saves = useSaves();

  return useMemo(() => {
    const counts = new Map<string, number>();
    const descriptor = FIELD_DESCRIPTORS[field];
    if (!descriptor) return counts;

    const tally = (value: unknown) => {
      const key = String(value ?? "").toLowerCase();
      if (!key) return;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    };

    for (const save of saves) {
      if (save.deletedAt || save.status !== "complete") continue;
      const projected = descriptor.project(save);
      if (Array.isArray(projected)) {
        for (const value of projected) tally(value);
      } else {
        tally(projected);
      }
    }

    return counts;
  }, [saves, field]);
}
