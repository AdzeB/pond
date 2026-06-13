import { useCallback, useMemo } from "react";
import type { BodyProps } from "@/components/library-view-menu/filter/value-select/types";
import { TagMenu } from "@/components/tag-menu";
import { useFieldValueCounts } from "@/hooks/use-field-counts";
import { useSelectionSet } from "./_picker";

export function TagsBody({ predicate, onChange }: BodyProps) {
  const selected = useSelectionSet(predicate.value);
  const counts = useFieldValueCounts("tags");

  const appliedKeys = useMemo(
    () => new Set(Array.from(selected, (s) => s.toLowerCase())),
    [selected],
  );

  const toggle = useCallback(
    (name: string) => {
      const lower = name.toLowerCase();
      const next = Array.from(selected);
      const idx = next.findIndex((t) => t.toLowerCase() === lower);
      if (idx >= 0) next.splice(idx, 1);
      else next.push(name);
      onChange({ ...predicate, value: next });
    },
    [selected, predicate, onChange],
  );

  return (
    <TagMenu
      appliedKeys={appliedKeys}
      counts={counts}
      onToggle={toggle}
      groupsAs="section"
      placeholder="Filter tags…"
      emptyLabel="No tags yet."
    />
  );
}
