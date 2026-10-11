import { Input } from "@pond/ui";
import type { RefObject } from "react";

export function WatchTargetField({
  inputRef,
  value,
  placeholder,
  disabled,
  invalid,
  onChange,
}: {
  inputRef: RefObject<HTMLInputElement | null>;
  value: string;
  placeholder: string;
  disabled: boolean;
  invalid: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <Input.Root>
      <Input.Field
        ref={inputRef}
        type="text"
        aria-label="Link or handle"
        aria-invalid={invalid || undefined}
        placeholder={placeholder}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      />
    </Input.Root>
  );
}
