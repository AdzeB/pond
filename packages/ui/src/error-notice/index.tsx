import { IconTriangleWarning } from "@pond/icons";
import type { ReactNode } from "react";
import { Button } from "../button";
import { Reveal } from "../reveal";
import styles from "./styles.module.css";

export function ErrorNotice({
  title = "Couldn't finish this response",
  children,
  onRetry,
  actions,
}: {
  title?: string;
  children?: ReactNode;
  onRetry?: () => void;
  actions?: ReactNode;
}) {
  return (
    <Reveal>
      <div className={styles.notice} role="alert">
        <IconTriangleWarning />
        <div className={styles["model-content"]}>
          <span className={styles["model-name"]}>{title}</span>
          {children && (
            <span className={styles["row-description"]}>{children}</span>
          )}
        </div>
        {onRetry && (
          <Button variant="secondary" size="xs" onClick={onRetry}>
            Retry
          </Button>
        )}
        {actions}
      </div>
    </Reveal>
  );
}
