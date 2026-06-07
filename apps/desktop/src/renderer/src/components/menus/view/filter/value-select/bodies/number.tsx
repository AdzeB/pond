import { FIELD_META } from "@pond/schema/filters/meta";
import { Input, Menu } from "@pond/ui";
import { useMemo, useState } from "react";
import styles from "../styles.module.css";
import type { BodyProps } from "../types";

export function NumberBody({ predicate, onChange }: BodyProps) {
  const [q, setQ] = useState("");
  const meta = FIELD_META[predicate.field];
  const presets = meta.presets ?? [];
  const value = predicate.value;
  const [min, max] =
    Array.isArray(value) && value.length === 2 ? value : [null, null];

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return presets;
    return presets.filter((p) => p.label.toLowerCase().includes(needle));
  }, [presets, q]);

  function applyPreset(presetValue: unknown) {
    const n =
      typeof presetValue === "number" ? presetValue : Number(presetValue);
    if (!Number.isFinite(n)) return;
    onChange({ ...predicate, operator: "lte", value: n });
  }

  function setRange(nextMin: string, nextMax: string) {
    const lo = nextMin === "" ? null : Number(nextMin);
    const hi = nextMax === "" ? null : Number(nextMax);
    if (lo !== null && hi !== null) {
      onChange({ ...predicate, operator: "between", value: [lo, hi] });
      return;
    }
    if (lo !== null) {
      onChange({ ...predicate, operator: "gte", value: lo });
      return;
    }
    if (hi !== null) {
      onChange({ ...predicate, operator: "lte", value: hi });
      return;
    }
    onChange({ ...predicate, operator: "between", value: [0, 0] });
  }

  return (
    <div className={styles.body}>
      <Menu.Input
        value={q}
        placeholder="Filter…"
        autoFocus
        onChange={(e) => setQ(e.target.value)}
      />
      {filtered.map((p) => (
        <Menu.Item key={p.id} onClick={() => applyPreset(p.value)}>
          <Menu.ItemLabel>{p.label}</Menu.ItemLabel>
        </Menu.Item>
      ))}
      {filtered.length === 0 ? (
        <div className={styles.empty}>No matches.</div>
      ) : null}
      <Menu.Separator />
      <div className={styles.range}>
        <Input.Field
          type="number"
          inputMode="numeric"
          placeholder="min"
          value={min == null ? "" : String(min)}
          onChange={(e) =>
            setRange(e.target.value, max == null ? "" : String(max))
          }
        />
        <span className={styles.dash} aria-hidden>
          –
        </span>
        <Input.Field
          type="number"
          inputMode="numeric"
          placeholder="max"
          value={max == null ? "" : String(max)}
          onChange={(e) =>
            setRange(min == null ? "" : String(min), e.target.value)
          }
        />
      </div>
    </div>
  );
}
