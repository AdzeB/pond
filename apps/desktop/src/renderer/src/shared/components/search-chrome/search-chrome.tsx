import { IconMagnifierOutline18 } from "@pond/icons/outline/18";
import { cn } from "@pond/ui";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import styles from "./search-chrome.module.css";

interface SearchChromeProps {
  children: ReactNode;
  actions?: ReactNode;
  below?: ReactNode;
  className?: string;
}

export function SearchChrome({
  children,
  actions,
  below,
  className,
}: SearchChromeProps) {
  return (
    <div className={cn(styles.root, className)}>
      <div className={styles.bar}>
        <span className={styles.mark} aria-hidden="true">
          <IconMagnifierOutline18 />
        </span>
        <div className={styles.search}>{children}</div>
        {actions ? <div className={styles.actions}>{actions}</div> : null}
      </div>
      {below ? <div className={styles.below}>{below}</div> : null}
    </div>
  );
}

export function SearchChromeInput({
  className,
  ...props
}: ComponentPropsWithoutRef<"input">) {
  return <input className={cn(styles.input, className)} {...props} />;
}
