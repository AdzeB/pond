import type { ReactNode } from "react";
import { CopyButton } from "@/components/copy-button";
import styles from "./styles.module.css";

export function Insight({
  label,
  copyText,
  children,
}: {
  label: string;
  copyText?: string;
  children: ReactNode;
}) {
  return (
    <div className={styles.insight}>
      <div className={styles.insightHead}>
        <span className={styles.insightLabel}>{label}</span>
        {copyText ? <CopyButton text={copyText} /> : null}
      </div>
      {children}
    </div>
  );
}
