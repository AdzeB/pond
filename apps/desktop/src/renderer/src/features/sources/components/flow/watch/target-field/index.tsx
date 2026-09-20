import { Input } from "@pond/ui";
import type { RefObject } from "react";
import styles from "./styles.module.css";

export function WatchTargetField({
  inputRef,
  value,
  disabled,
  checking,
  onChange,
}: {
  inputRef: RefObject<HTMLInputElement | null>;
  value: string;
  disabled: boolean;
  checking: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <Input.Root className={styles.field} size="lg" variant="secondary">
      <Input.Field
        ref={inputRef}
        type="text"
        aria-label="Link or handle"
        placeholder="Paste a link or enter a handle"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      />
      {checking ? (
        <Input.Action>
          <span className={styles["field-spinner"]} />
        </Input.Action>
      ) : null}
    </Input.Root>
  );
}
