import { IconClipboardDocumentOutline18 as Clipboard } from "@pond/icons/outline/18";
import { Tooltip } from "@pond/ui";
import { useState } from "react";
import styles from "./styles.module.css";

// Small clipboard affordance shared by the Data tab and the Insights blocks.
// Reveals on row hover (or stays visible when `floating`).
export function CopyButton({
  text,
  floating,
  label = "Copy",
}: {
  text: string;
  floating?: boolean;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      // Clipboard can reject without a focused document; nothing to recover.
    }
  };
  return (
    <Tooltip label={copied ? "Copied" : label} side="top">
      <button
        type="button"
        className={styles.dataCopy}
        data-floating={floating ? "true" : undefined}
        aria-label={label}
        onClick={() => void copy()}
      >
        <Clipboard width={12} height={12} />
      </button>
    </Tooltip>
  );
}
