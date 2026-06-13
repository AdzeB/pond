"use client";

import { useState } from "react";
import styles from "./fragments.module.css";

interface CopyBlockProps {
  command: string;
  label?: string;
}

export function CopyBlock({ command, label = "Copy" }: CopyBlockProps) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      // Clipboard can fail under HTTP/restricted contexts; command is visible anyway.
    }
  }

  return (
    <div className={styles["copy-block"]}>
      <span className={styles["copy-block-prompt"]} aria-hidden>
        $
      </span>
      <code className={styles["copy-block-command"]}>{command}</code>
      <button
        type="button"
        className={styles["copy-block-button"]}
        onClick={copy}
        aria-label={copied ? "Copied" : label}
      >
        {copied ? "Copied" : label}
      </button>
    </div>
  );
}
