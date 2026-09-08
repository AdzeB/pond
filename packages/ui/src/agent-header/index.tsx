import { clsx as cn } from "clsx";
import type { ComponentProps } from "react";
import styles from "./styles.module.css";

export function AgentHeader({
  title,
  subtitle,
  children,
  ...props
}: ComponentProps<"header"> & { title: string; subtitle?: string }) {
  return (
    <header {...props} className={cn(styles.agentHeader, props.className)}>
      <span className={styles.headerTitle}>
        {title}
        {subtitle && <span className={styles.rowDescription}>{subtitle}</span>}
      </span>
      <div className={styles.headerActions}>{children}</div>
    </header>
  );
}
