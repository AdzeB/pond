import type { ComponentProps } from "react";
import { PaneHeader } from "../pane-header";
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
    <PaneHeader
      {...props}
      title={
        <>
          {title}
          {subtitle && (
            <span className={styles["row-description"]}>{subtitle}</span>
          )}
        </>
      }
    >
      {children}
    </PaneHeader>
  );
}
