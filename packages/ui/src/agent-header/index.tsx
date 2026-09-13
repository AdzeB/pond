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
    <header {...props} className={cn(styles["agent-header"], props.className)}>
      <span className={styles["header-title"]}>
        {title}
        {subtitle && (
          <span className={styles["row-description"]}>{subtitle}</span>
        )}
      </span>
      <div className={styles["header-actions"]}>{children}</div>
    </header>
  );
}
