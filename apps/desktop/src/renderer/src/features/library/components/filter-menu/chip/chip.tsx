import { IconXmarkOutline12 } from "@pond/icons/outline/12";
import { Button, Menu } from "@pond/ui";
import { clsx as cn } from "clsx";
import type { ComponentProps, ReactNode } from "react";
import { libraryHeader } from "@/features/library/state/library-header";
import type { FilterLayout } from "../layout";
import styles from "./chip.module.css";

export function FilterChip({
  icon,
  label,
  title,
  active,
  ariaLabel,
  onClear,
  clearLabel,
  children,
}: {
  icon: ReactNode;
  label: string;
  title?: string;
  active?: boolean;
  ariaLabel: string;
  onClear?: () => void;
  clearLabel?: string;
  children: ReactNode;
}) {
  return (
    <div className={styles.root} data-active={active || undefined}>
      <Menu.Root
        onOpenChange={(open) => {
          if (open) libraryHeader.closePopover();
        }}
      >
        <Menu.Trigger
          size="sm"
          variant="ghost"
          className={styles.trigger}
          aria-label={ariaLabel}
          title={title ?? label}
        >
          <span className={styles.icon} aria-hidden>
            {icon}
          </span>
          <span className={styles.label}>{label}</span>
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner side="bottom" align="start" sideOffset={6}>
            {children}
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
      {active && onClear ? (
        <Button
          icon
          size="xs"
          variant="ghost"
          className={styles.clear}
          aria-label={clearLabel}
          onClick={onClear}
        >
          <IconXmarkOutline12 />
        </Button>
      ) : null}
    </div>
  );
}

export function FilterPopup({
  layout,
  className,
  ...props
}: ComponentProps<typeof Menu.Popup> & { layout?: FilterLayout }) {
  return (
    <Menu.Popup
      className={cn(styles.popup, className)}
      data-layout={layout}
      {...props}
    />
  );
}
