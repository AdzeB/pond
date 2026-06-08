import { IconCheckOutline18 as Check } from "@pond/icons/outline/18";
import { Select } from "@pond/ui";
import type { ReactNode } from "react";

export interface EnumOption<T> {
  value: T;
  label: ReactNode;
}

export interface EnumSelectProps<T> {
  value: T;
  onValueChange: (value: T) => void;
  options: readonly EnumOption<T>[];
  placeholder?: ReactNode;
  disabled?: boolean;
  /** Applied to the trigger. */
  className?: string;
  align?: "start" | "center" | "end";
  side?: "top" | "right" | "bottom" | "left";
  sideOffset?: number;
  "aria-label"?: string;
}

export function EnumSelect<T>({
  value,
  onValueChange,
  options,
  placeholder,
  disabled,
  className,
  align,
  side,
  sideOffset = 6,
  "aria-label": ariaLabel,
}: EnumSelectProps<T>) {
  const selected = options.find((option) => Object.is(option.value, value));
  const hasNullOption = options.some((option) => option.value === null);

  return (
    <Select.Root<T>
      value={value}
      disabled={disabled}
      onValueChange={(next) => {
        if (next === null && !hasNullOption) return;
        onValueChange(next as T);
      }}
    >
      <Select.Trigger className={className} aria-label={ariaLabel}>
        <Select.Value>{selected?.label ?? placeholder}</Select.Value>
      </Select.Trigger>
      <Select.Portal>
        <Select.Positioner sideOffset={sideOffset} align={align} side={side}>
          <Select.Popup>
            {options.map((option) => (
              <Select.Item key={keyFor(option.value)} value={option.value}>
                <Select.ItemText>{option.label}</Select.ItemText>
                <Select.ItemIndicator>
                  <Check width={14} height={14} />
                </Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
}

function keyFor(value: unknown): string {
  return typeof value === "object" && value !== null
    ? JSON.stringify(value)
    : String(value);
}
