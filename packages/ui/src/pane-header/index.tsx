import { clsx as cn } from "clsx";
import {
  type ComponentPropsWithoutRef,
  forwardRef,
  type ReactNode,
} from "react";
import styles from "./styles.module.css";

interface PaneHeaderProps
  extends Omit<ComponentPropsWithoutRef<"header">, "title"> {
  title: ReactNode;
}

export function PaneHeader({
  title,
  children,
  className,
  ...props
}: PaneHeaderProps) {
  return (
    <header
      {...props}
      className={cn(styles.root, className)}
      data-slot="pane-header"
    >
      <div className={styles.title} data-slot="pane-header-title">
        {title}
      </div>
      <div className={styles.actions} data-slot="pane-header-actions">
        {children}
      </div>
    </header>
  );
}

export const PaneBody = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<"div">
>(function PaneBody({ className, ...props }, ref) {
  return (
    <div
      {...props}
      ref={ref}
      className={cn(styles.body, className)}
      data-slot="pane-body"
    />
  );
});
