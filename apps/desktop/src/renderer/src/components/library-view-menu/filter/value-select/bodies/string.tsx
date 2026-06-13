import { FIELD_META } from "@pond/schema/filters/meta";
import { Input } from "@pond/ui";
import styles from "@/components/library-view-menu/filter/value-select/styles.module.css";
import type { BodyProps } from "@/components/library-view-menu/filter/value-select/types";

export function StringBody({ predicate, onChange }: BodyProps) {
  const meta = FIELD_META[predicate.field];
  const value = typeof predicate.value === "string" ? predicate.value : "";

  return (
    <div className={styles.body} data-variant="narrow">
      <Input.Field
        type="search"
        value={value}
        autoFocus
        placeholder={meta.label}
        spellCheck={false}
        onChange={(e) => onChange({ ...predicate, value: e.target.value })}
      />
    </div>
  );
}
