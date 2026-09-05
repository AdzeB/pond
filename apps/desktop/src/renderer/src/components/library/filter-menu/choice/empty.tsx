import type { FieldId, Predicate } from "@pond/schema/filters/types";
import { Menu } from "@pond/ui";
import { excludeGestures } from "./exclude";
import { ChoiceIndicator } from "./indicator";

export function EmptyChoice({
  field,
  label,
  count,
  rows,
  onChange,
}: {
  field: FieldId;
  label: string;
  count: number;
  rows: Predicate[];
  onChange: (rows: Predicate[]) => void;
}) {
  const current = rows.find(
    (row) => row.field === field && row.operator === "empty",
  );
  const change = (checked: boolean, excluded = false) =>
    onChange([
      ...rows.filter((row) => row.field !== field),
      ...(checked
        ? [
            {
              field,
              operator: "empty" as const,
              value: true,
              ...(excluded ? { negate: true } : {}),
            },
          ]
        : []),
    ]);
  return (
    <Menu.CheckboxItem
      closeOnClick={false}
      checked={!!current}
      data-excluded={current?.negate || undefined}
      aria-description={current?.negate ? "Excluded" : undefined}
      onCheckedChange={(checked) => change(checked)}
      {...excludeGestures(() => change(!current, true))}
    >
      <ChoiceIndicator excluded={current?.negate} />
      <Menu.ItemLabel>{label}</Menu.ItemLabel>
      <Menu.SecondaryLabel>{count}</Menu.SecondaryLabel>
    </Menu.CheckboxItem>
  );
}
