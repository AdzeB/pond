import { IconCheckOutline18 as Check } from "@pond/icons/outline/18";
import { Menu } from "@pond/ui";
import { useCallback, useMemo, useState } from "react";
import { useSaves } from "@/pool/hooks";
import styles from "../styles.module.css";
import type { BodyProps } from "../types";

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

  const selected = useMemo(() => {
    const v = predicate.value;
    if (Array.isArray(v)) return new Set(v.map(String));
    if (typeof v === "string" && v) return new Set([v]);
    return new Set<string>();
  }, [predicate.value]);

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
    <div className={styles.body} data-variant="scroll">
      <Menu.Input
        value={q}
        placeholder="Filter creators…"
        autoFocus
        onChange={(e) => setQ(e.target.value)}
      />
      {filtered.length === 0 ? (
        <div className={styles.empty}>
          {creators.length === 0 ? "No creators yet." : "No matches."}
        </div>
      ) : (
        filtered.map((c) => {
          const checked = selected.has(c.name);
          return (
            <Menu.CheckboxItem
              key={c.name}
              closeOnClick={false}
              checked={checked}
              onCheckedChange={() => toggle(c.name)}
            >
              <span className={styles.check} aria-hidden>
                {checked ? <Check width="0.85em" height="0.85em" /> : null}
              </span>
              <Menu.ItemLabel>{c.name}</Menu.ItemLabel>
              <span className={styles.count}>{c.count}</span>
            </Menu.CheckboxItem>
          );
        })
      )}
    </div>
  );
}
