import { FIELD_META } from "@pond/schema/filters/meta";
import type { FieldId, Predicate } from "@pond/schema/filters/types";
import { Button, Input, Menu } from "@pond/ui";
import { useId, useState } from "react";
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
        className={styles["content-form"]}
        onKeyDown={(event) => {
          if (event.key !== "Escape" && event.key !== "Tab")
            event.stopPropagation();
        }}
        onSubmit={(event) => {
          event.preventDefault();
          if (text.trim())
            apply({ field, operator: "contains", value: text.trim() });
        }}
      >
        <label className={styles["content-field"]} htmlFor={inputId}>
          <span>Contains Text</span>
          <Input.Root size="sm">
            <Input.Field
              id={inputId}
              aria-label={`Search ${label}`}
              value={text}
              onValueChange={setText}
              placeholder={`Search ${label.toLowerCase()}…`}
            />
          </Input.Root>
        </label>
        <Button
          type="submit"
          size="sm"
          variant="secondary"
          disabled={!text.trim()}
        >
          Apply
        </Button>
      </form>
    </>
  );
}
