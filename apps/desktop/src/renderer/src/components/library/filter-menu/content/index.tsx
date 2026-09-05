import { FIELD_META } from "@pond/schema/filters/meta";
import type { FieldId, Predicate } from "@pond/schema/filters/types";
import { Input, Menu } from "@pond/ui";
import { useId, useState } from "react";
import { stopMenuKeys } from "../menu-keys";
import { useFilterDraft } from "../use-filter-draft";
import styles from "./styles.module.css";

export function ContentFilter({
  field,
  rows,
  onChange,
}: {
  field: FieldId;
  rows: Predicate[];
  onChange: (rows: Predicate[]) => void;
}) {
  const schedule = useFilterDraft();
  const label = FIELD_META[field].label;
  const inputId = useId();
  const rules = rows.filter((row) => row.field === field);
  const [text, setText] = useState(
    String(rules.find((row) => row.operator === "contains")?.value ?? ""),
  );
  const apply = (rule?: Predicate) =>
    onChange([
      ...rows.filter((row) => row.field !== field),
      ...(rule ? [rule] : []),
    ]);
  return (
    <>
      {[true, false].map((value) => (
        <Menu.CheckboxItem
          key={String(value)}
          closeOnClick={false}
          checked={rules.some(
            (row) =>
              row.operator === "exists" && row.value === value && !row.negate,
          )}
          onCheckedChange={(checked) => {
            schedule();
            setText("");
            apply(checked ? { field, operator: "exists", value } : undefined);
          }}
        >
          <Menu.CheckboxItemIndicator />
          <Menu.ItemLabel>
            {value ? `With ${label}` : `Without ${label}`}
          </Menu.ItemLabel>
        </Menu.CheckboxItem>
      ))}
      <Menu.Separator />
      <form
        className={styles.form}
        onKeyDown={stopMenuKeys}
        onSubmit={(event) => {
          event.preventDefault();
          schedule();
          if (text.trim())
            apply({ field, operator: "contains", value: text.trim() });
        }}
      >
        <label className={styles.field} htmlFor={inputId}>
          <span>Keywords</span>
          <Input.Root size="sm">
            <Input.Textarea
              id={inputId}
              aria-label={`Search ${label}`}
              value={text}
              onValueChange={(value) => {
                setText(value);
                schedule(() =>
                  apply(
                    value.trim()
                      ? { field, operator: "contains", value: value.trim() }
                      : undefined,
                  ),
                );
              }}
              placeholder={`Search ${label.toLowerCase()}…`}
              rows={3}
            />
          </Input.Root>
        </label>
      </form>
    </>
  );
}
