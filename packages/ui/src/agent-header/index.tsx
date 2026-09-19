import { clsx as cn } from "clsx";
import type { ComponentProps } from "react";
import styles from "./styles.module.css";

export function AgentHeader({
  title,
  subtitle,
  children,
  ...props
}: Omit<ComponentProps<"header">, "title"> & {
  title: React.ReactNode;
  subtitle?: string;
}) {
  return (
    <header {...props} className={cn(styles["agent-header"], props.className)}>
      <div className={styles["header-title"]}>
        {title}
        {subtitle && (
          <span className={styles["row-description"]}>{subtitle}</span>
        )}
      </div>
      <div className={styles["header-actions"]}>{children}</div>
    </header>
  );
}
