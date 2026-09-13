import {
  IconCheckOutline18,
  IconClone2Outline18,
} from "@pond/icons/outline/18";
import { useState } from "react";
import { Button } from "../button";
import styles from "./styles.module.css";

export function CodeHeader({
  language,
  code,
}: {
  language?: string;
  code: string;
}) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const copied = copiedCode === code;
  const [error, setError] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setError(false);
    } catch {
      setError(true);
    }
  }
  return (
    <div className={styles["code-header"]}>
      <span>{language || "Code"}</span>
      <Button
        size="xs"
        variant="ghost"
        onClick={() => void copy()}
        aria-label="Copy code"
      >
        {copied ? <IconCheckOutline18 /> : <IconClone2Outline18 />}
        {copied ? "Copied" : "Copy"}
      </Button>
      {error && <span role="status">Select the code to copy it</span>}
    </div>
  );
}

export function CodeBlock({
  code,
  language,
}: {
  code: string;
  language?: string;
}) {
  return (
    <div className={styles["code-block"]}>
      <CodeHeader code={code} language={language} />
      <pre>
        <code>{code}</code>
      </pre>
    </div>
  );
}
