import { IconCopyFill18 } from "@pond/icons/fill/18";
import {
  IconChatBubbleOutline18,
  IconCheckOutline18,
} from "@pond/icons/outline/18";
import { useEffect, useState } from "react";
import styles from "./message-actions.module.css";

export function CopyButton({
  text,
  label = "Copy Response",
}: {
  text: string;
  label?: string;
}) {
  const [status, setStatus] = useState<"idle" | "copied" | "error">("idle");
  useEffect(() => {
    if (status !== "copied") return;
    const timer = setTimeout(() => setStatus("idle"), 2000);
    return () => clearTimeout(timer);
  }, [status]);
  return (
    <span className={styles.copy}>
      <button
        type="button"
        aria-label={label}
        title={label}
        className={styles.action}
        onClick={() => {
          void navigator.clipboard
            .writeText(text)
            .then(() => setStatus("copied"))
            .catch(() => setStatus("error"));
        }}
      >
        {status === "copied" ? <IconCheckOutline18 /> : <IconCopyFill18 />}
        <span>{status === "copied" ? "Copied" : "Copy"}</span>
      </button>
      {status === "error" ? (
        <span role="alert">Could not copy. Try again.</span>
      ) : null}
    </span>
  );
}

export function MessageActions({
  text,
  onQuote,
  disabled,
}: {
  text: string;
  onQuote: () => void;
  disabled?: boolean;
}) {
  return (
    <div className={styles.actions}>
      <CopyButton text={text} />
      <button
        type="button"
        className={styles.action}
        disabled={disabled}
        onClick={onQuote}
        title="Quote in your message"
      >
        <IconChatBubbleOutline18 />
        <span>Quote</span>
      </button>
    </div>
  );
}
