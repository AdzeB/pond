import { Button, Popover } from "@pond/ui";
import type { ReactNode } from "react";
import styles from "./panel.module.css";

interface StatusPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  label: string;
  icon: ReactNode;
  children: ReactNode;
}

/** Ghost icon trigger + downward popover for the chrome toolbar cluster. */
export function StatusPanel({
  open,
  onOpenChange,
  label,
  icon,
  children,
}: StatusPanelProps) {
  return (
    <Popover.Root open={open} onOpenChange={onOpenChange}>
      <Button
        render={<Popover.Trigger />}
        variant="ghost"
        size="sm"
        icon
        aria-label={label}
      >
        {icon}
      </Button>
      <Popover.Portal>
        <Popover.Positioner side="bottom" align="end" sideOffset={8}>
          <Popover.Popup className={styles.popup}>{children}</Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className={styles.empty}>{children}</div>;
}

export function List({ children }: { children: ReactNode }) {
  return <div className={styles.list}>{children}</div>;
}

interface RowProps {
  title: string;
  subtitle?: string;
  meta?: string;
  onClick?: () => void;
}

export function Row({ title, subtitle, meta, onClick }: RowProps) {
  const body = (
    <>
      <span className={styles["row-body"]}>
        <span className={styles["row-title"]}>{title}</span>
        {subtitle ? (
          <span className={styles["row-sub"]}>{subtitle}</span>
        ) : null}
      </span>
      {meta ? <span className={styles["row-meta"]}>{meta}</span> : null}
    </>
  );

  if (onClick) {
    return (
      <button type="button" className={styles.row} onClick={onClick}>
        {body}
      </button>
    );
  }
  return <div className={styles.row}>{body}</div>;
}
