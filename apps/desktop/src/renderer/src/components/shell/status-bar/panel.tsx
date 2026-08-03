import { Button, Popover } from "@pond/ui";
import type { ReactNode } from "react";
import styles from "./panel.module.css";

interface StatusPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  label: string;
  icon: ReactNode;
  tone?: "run" | "warn" | "err" | null;
  children: ReactNode;
}

/** Ghost icon trigger + downward popover for the chrome tab-bar cluster. */
export function StatusPanel({
  open,
  onOpenChange,
  label,
  icon,
  tone = null,
  children,
}: StatusPanelProps) {
  return (
    <Popover.Root open={open} onOpenChange={onOpenChange}>
      <Button
        render={<Popover.Trigger />}
        icon
        size="sm"
        variant="ghost"
        aria-label={label}
        className={styles.trigger}
        data-active={open ? "" : undefined}
      >
        {icon}
        {tone ? (
          <span className={styles.badge} data-tone={tone} aria-hidden />
        ) : null}
      </Button>
      <Popover.Portal>
        <Popover.Positioner side="bottom" align="end" sideOffset={8}>
          <Popover.Popup className={styles.popup}>{children}</Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

interface SectionProps {
  title: string;
  meta?: string;
  children: ReactNode;
}

export function Section({ title, meta, children }: SectionProps) {
  return (
    <section className={styles.section}>
      <header className={styles["section-head"]}>
        <span>{title}</span>
        {meta ? <span className={styles["section-meta"]}>{meta}</span> : null}
      </header>
      {children}
    </section>
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
  tone?: "run" | "ok" | "warn" | "err" | "idle";
  onClick?: () => void;
}

export function Row({
  title,
  subtitle,
  meta,
  tone = "idle",
  onClick,
}: RowProps) {
  const body = (
    <>
      <span className={styles["row-dot"]} data-tone={tone} aria-hidden />
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

export function PanelFooter({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <div className={styles.footer}>
      <Button variant="link" size="xs" onClick={onClick}>
        {label}
      </Button>
    </div>
  );
}
