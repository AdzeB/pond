import { IconTriangleWarningOutline18 } from "@pond/icons/outline/18";
import type { ReactNode } from "react";
import { Button } from "../button";
import { Reveal } from "../reveal";
import styles from "./styles.module.css";

export function ErrorNotice({
  title = "Couldn't finish this response",
  children,
  onRetry,
}: {
  title?: string;
  children?: ReactNode;
  onRetry?: () => void;
}) {
  return (
    <Reveal>
      <div className={styles.notice} role="alert">
        <IconTriangleWarningOutline18 />
        <div className={styles.modelContent}>
          <span className={styles.modelName}>{title}</span>
          {children && (
            <span className={styles.rowDescription}>{children}</span>
          )}
        </div>
        {onRetry && (
          <Button variant="secondary" size="xs" onClick={onRetry}>
            Retry
          </Button>
        )}
      </div>
    </Reveal>
  );
}
