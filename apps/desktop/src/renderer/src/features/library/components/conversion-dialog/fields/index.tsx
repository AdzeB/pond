import { Checkbox, Field, Input, Select } from "@pond/ui";
import { useId } from "react";
import styles from "./styles.module.css";

function NumberField({
  label,
  suffix,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  suffix?: string;
  value: number | null;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number | null) => void;
}) {
  return (
    <Field.Root className={styles.field}>
      <Field.Label>{label}</Field.Label>
      <Input.Root>
        <Input.Field
          type="number"
          min={min}
          max={max}
          step={step}
          value={value === null || Number.isNaN(value) ? "" : value}
          onChange={(event) =>
            onChange(event.target.value ? event.target.valueAsNumber : null)
          }
        />
        {suffix ? <Input.Suffix>{suffix}</Input.Suffix> : null}
      </Input.Root>
    </Field.Root>
  );
}

function LosslessField({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean;
  disabled: boolean;
  onChange: (checked: boolean) => void;
}) {
  const id = useId();
  return (
    <div className={styles.check}>
      <Checkbox.Root
        id={id}
        checked={checked}
        disabled={disabled}
        onCheckedChange={onChange}
      >
        <Checkbox.Indicator />
      </Checkbox.Root>
      <label htmlFor={id}>Lossless</label>
    </div>
  );
}

function SelectField<Value extends string>({
  label,
  value,
  items,
  onChange,
}: {
  label: string;
  value: Value;
  items: {
    value: Value;
    label: string;
    disabled?: boolean;
  }[];
  onChange: (value: Value) => void;
}) {
  return (
    <Select.Root
      value={value}
      items={items}
      onValueChange={(next) => {
        if (next !== null) onChange(next);
      }}
    >
      <div className={styles.field}>
        <Select.Label>{label}</Select.Label>
        <Select.Trigger width="full">
          <Select.Value />
        </Select.Trigger>
      </div>
      <Select.Portal>
        <Select.Positioner>
          <Select.Popup>
            <Select.Items items={items} />
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
}

export const ExportField = {
  Number: NumberField,
  Lossless: LosslessField,
  Select: SelectField,
};
