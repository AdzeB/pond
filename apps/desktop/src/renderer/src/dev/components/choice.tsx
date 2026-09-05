import { Select } from "@pond/ui";

export function Choice<T extends string>({
  label,
  value,
  values,
  onChange,
}: {
  label: string;
  value: T;
  values: readonly T[];
  onChange: (value: T) => void;
}) {
  const items = values.map((value) => ({ value, label: value }));
  return (
    <Select.Root<T>
      items={items}
      value={value}
      onValueChange={(next) => {
        if (next !== null) onChange(next);
      }}
    >
      <Select.Trigger aria-label={label} size="sm" rounding="rounded">
        <Select.Value />
      </Select.Trigger>
      <Select.Portal>
        <Select.Positioner align="start">
          <Select.Popup>
            <Select.Items items={items} />
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
}
