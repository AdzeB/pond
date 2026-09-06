import { type ReactNode, useId, useRef, useState } from "react";
import styles from "./detail.module.css";

export function ProfileField({
  label,
  value,
  placeholder,
  icon,
  onSave,
}: {
  label: string;
  value: string;
  placeholder: string;
  icon: ReactNode;
  onSave: (value: string) => Promise<void>;
}) {
  const id = useId();
  const savedValue = useRef("");
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const save = async (next: string) => {
    if (next === savedValue.current) return;
    setStatus("saving");
    try {
      await onSave(next);
      savedValue.current = next;
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  };
  return (
    <div className={styles.profileField}>
      <label className={styles.row} htmlFor={id}>
        <span className={styles.icon}>{icon}</span>
        <input
          id={id}
          className={styles.input}
          defaultValue=""
          aria-label={label}
          placeholder={value || placeholder}
          disabled={status === "saving"}
          aria-invalid={status === "error"}
          aria-describedby={status === "error" ? `${id}-status` : undefined}
          onChange={() => setStatus("idle")}
          onBlur={(event) => void save(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
          }}
        />
      </label>
      {status === "error" && (
        <p id={`${id}-status`} className={styles.fieldStatus} role="alert">
          Couldn't save. Focus the field and press Enter to try again.
        </p>
      )}
    </div>
  );
}
