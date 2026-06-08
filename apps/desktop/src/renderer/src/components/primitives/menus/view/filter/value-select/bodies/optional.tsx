import { Menu } from "@pond/ui";
import { useMemo, useState } from "react";
import styles from "../styles.module.css";
import type { BodyProps } from "../types";

interface OptionalChoice {
  id: string;
  label: string;
  value: boolean;
}

const OPTIONAL_CHOICES: readonly OptionalChoice[] = [
  { id: "with", label: "With note", value: true },
  { id: "without", label: "Without note", value: false },
];

export function OptionalBody({ predicate, onChange }: BodyProps) {
  const [q, setQ] = useState("");
  const value = predicate.value !== false;

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return OPTIONAL_CHOICES;
    return OPTIONAL_CHOICES.filter((c) =>
      c.label.toLowerCase().includes(needle),
    );
  }, [q]);

  return (
    <div className={styles.body} data-variant="narrow">
      <Menu.Input
        value={q}
        placeholder="Filter…"
        autoFocus
        onChange={(e) => setQ(e.target.value)}
      />
      {filtered.map((choice) => (
        <Menu.Item
          key={choice.id}
          onClick={() =>
            onChange({ ...predicate, operator: "exists", value: choice.value })
          }
          data-active={value === choice.value ? "true" : undefined}
        >
          <Menu.ItemLabel>{choice.label}</Menu.ItemLabel>
        </Menu.Item>
      ))}
      {filtered.length === 0 ? (
        <div className={styles.empty}>No matches.</div>
      ) : null}
    </div>
  );
}
