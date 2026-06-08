import { useCallback, useMemo, useState } from "react";
import { useSaves } from "@/core/data/hooks";
import type { BodyProps } from "../types";
import { LivePicker, useSelectionSet } from "./_picker";

// The distinct authors across the library, picked like an enum. Unlike the
// static enum presets, the option list is derived from live save data.
export function CreatorBody({ predicate, onChange }: BodyProps) {
  const [q, setQ] = useState("");
  const saves = useSaves();

  const creators = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of saves) {
      if (s.deletedAt) continue;
      const name = s.author?.trim();
      if (!name) continue;
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
    return Array.from(counts, ([name, count]) => ({ name, count })).sort(
      (a, b) => b.count - a.count || a.name.localeCompare(b.name),
    );
  }, [saves]);

  const selected = useSelectionSet(predicate.value);

  const needle = q.trim().toLowerCase();
  const filtered = creators.filter((c) =>
    c.name.toLowerCase().includes(needle),
  );

  const toggle = useCallback(
    (name: string) => {
      const next = new Set(selected);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      const list = Array.from(next);
      const negative =
        predicate.operator === "neq" || predicate.operator === "nin";
      if (list.length === 1) {
        onChange({
          ...predicate,
          operator: negative ? "neq" : "eq",
          value: list[0] ?? "",
        });
        return;
      }
      onChange({
        ...predicate,
        operator: negative ? "nin" : "in",
        value: list,
      });
    },
    [selected, predicate, onChange],
  );

  return (
    <LivePicker
      query={q}
      onQueryChange={setQ}
      placeholder="Filter creators…"
      sections={[
        {
          key: "creators",
          items: filtered.map((c) => ({ value: c.name, count: c.count })),
        },
      ]}
      selected={selected}
      onToggle={toggle}
      emptyLabel="No creators yet."
    />
  );
}
