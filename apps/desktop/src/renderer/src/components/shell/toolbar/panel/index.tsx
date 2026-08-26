import { Button, Popover } from "@pond/ui";
import type { ReactNode } from "react";
import { useScrollFade } from "@/hooks/use-scroll-fade";
import type { StatusEntity } from "../lib";
import styles from "./styles.module.css";

interface StatusPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ariaLabel?: string;
  heading: string;
  icon: ReactNode;
  children: ReactNode;
}

export function StatusPanel({
  open,
  onOpenChange,
  ariaLabel,
  heading,
  icon,
  children,
}: StatusPanelProps) {
  const scrollFade = useScrollFade<HTMLDivElement>();
  return (
    <Popover.Root open={open} onOpenChange={onOpenChange}>
      <Button
        render={<Popover.Trigger />}
        variant="ghost"
        size="sm"
        icon
        aria-label={ariaLabel ?? heading}
      >
        {icon}
      </Button>
      <Popover.Portal>
        <Popover.Positioner side="bottom" align="end" sideOffset={8}>
          <Popover.Popup className={styles.popup} {...scrollFade}>
            <h2 className={styles.heading}>{heading}</h2>
            {children}
          </Popover.Popup>
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
      <span className={styles.body}>
        <span className={styles.title}>{title}</span>
        {subtitle ? <span className={styles.sub}>{subtitle}</span> : null}
      </span>
      {meta ? <span className={styles.meta}>{meta}</span> : null}
    </>
  );

  if (onClick) {
    return (
      <Button
        variant="ghost"
        width="full"
        className={styles.row}
        onClick={onClick}
      >
        {body}
      </Button>
    );
  }
  return <div className={styles.row}>{body}</div>;
}

export function EntityRow({
  entity,
  subtitle,
  meta,
  onClick,
}: {
  entity: StatusEntity;
  subtitle: string;
  meta: string;
  onClick: () => void;
}) {
  return (
    <Row
      title={entity.title}
      subtitle={subtitle}
      meta={meta}
      onClick={onClick}
    />
  );
}
