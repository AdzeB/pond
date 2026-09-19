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
    <div className={styles.field}>
      <input
        ref={inputRef}
        type="text"
        aria-label="Link or handle"
        placeholder="Paste a link or enter a handle"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      />
      {checking ? <span className={styles["field-spinner"]} /> : null}
    </div>
  );
}
