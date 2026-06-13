import { FIELD_META } from "@pond/schema/filters/meta";
import { Menu } from "@pond/ui";
import { useMemo, useState } from "react";
import styles from "@/components/library-view-menu/filter/value-select/styles.module.css";
import type { BodyProps } from "@/components/library-view-menu/filter/value-select/types";
import { useFieldValueCounts } from "@/hooks/use-field-counts";

export function EnumBody({ predicate, onChange }: BodyProps) {
  const [q, setQ] = useState("");
  const meta = FIELD_META[predicate.field];
  const presets = meta.presets ?? [];
  const counts = useFieldValueCounts(predicate.field);

  const selected = useMemo(() => {
    const v = predicate.value;
    if (Array.isArray(v)) return new Set(v.map(String));
    if (typeof v === "string" && v) return new Set([v]);
    return new Set<string>();
  }, [predicate.value]);

  const filtered = presets.filter((p) =>
    p.label.toLowerCase().includes(q.trim().toLowerCase()),
  );

  function toggle(value: unknown) {
    const next = new Set(selected);
    const key = String(value);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    const list = Array.from(next);
    if (list.length === 1) {
      onChange({
        ...predicate,
        operator:
          predicate.operator === "neq" || predicate.operator === "nin"
            ? "neq"
            : "eq",
        value: list[0] ?? "",
      });
      return;
    }
    onChange({
      ...predicate,
      operator:
        predicate.operator === "neq" || predicate.operator === "nin"
          ? "nin"
          : "in",
      value: list,
    });
  }

  if (!presets.length) {
    return (
      <div className={styles.body}>
        <div className={styles.empty}>Nothing to pick.</div>
      </div>
    );
  }

  return (
    <div className={styles.body} data-variant="scroll">
      <Menu.Input
        value={q}
        placeholder={`Filter ${meta.label.toLowerCase()}…`}
        autoFocus
        onChange={(e) => setQ(e.target.value)}
      />
      {filtered.map((p) => {
        const checked = selected.has(String(p.value));
        const count = counts.get(String(p.value).toLowerCase());
        return (
          <Menu.CheckboxItem
            key={p.id}
            closeOnClick={false}
            checked={checked}
            onCheckedChange={() => toggle(p.value)}
          >
            <Menu.CheckboxItemIndicator />
            <Menu.ItemLabel>{p.label}</Menu.ItemLabel>
            {count != null ? (
              <Menu.SecondaryLabel className={styles.count}>
                {count}
              </Menu.SecondaryLabel>
            ) : null}
          </Menu.CheckboxItem>
        );
      })}
      {filtered.length === 0 ? (
        <div className={styles.empty}>No matches.</div>
      ) : null}
    </div>
  );
}
