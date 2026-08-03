import type { WatchKind } from "@pond/schema/db";
import type { RefObject } from "react";
import styles from "./target-field.module.css";

function watchPlaceholder(kind: WatchKind): string {
  switch (kind) {
    case "channel":
      return "Search Channels…";
    case "group":
      return "Search Groups…";
    case "playlist":
      return "Paste a playlist link…";
    case "board":
      return "Search Boards…";
    case "cluster":
      return "Search Clusters…";
    case "list":
      return "Paste a list link…";
    default:
      return "Search Accounts…";
  }
}

export function WatchTargetField({
  inputRef,
  kind,
  value,
  disabled,
  checking,
  onChange,
  onSubmit,
  onPaste,
}: {
  inputRef: RefObject<HTMLInputElement | null>;
  kind: WatchKind;
  value: string;
  disabled: boolean;
  checking: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onPaste: () => void;
}) {
  return (
    <div className={styles.field}>
      <input
        ref={inputRef}
        type="text"
        placeholder={watchPlaceholder(kind)}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onSubmit();
        }}
      />
      {checking ? <span className={styles["field-spinner"]} /> : null}
      <button
        type="button"
        className={styles.paste}
        disabled={disabled}
        onClick={onPaste}
      >
        Paste
      </button>
    </div>
  );
}
