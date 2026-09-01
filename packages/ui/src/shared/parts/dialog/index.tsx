import { clsx as cn } from "clsx";
import type React from "react";
import styles from "../../styles/dialog/styles.module.css";

interface HeaderProps extends React.ComponentPropsWithoutRef<"div"> {
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
}

export function Header({
  leading,
  trailing,
  children,
  className,
  ...props
}: HeaderProps) {
  return (
    <div className={cn(styles.header, className)} {...props}>
      {leading ? <div className={styles.leading}>{leading}</div> : null}
      <div className={styles.headings}>{children}</div>
      {trailing ? <div className={styles.trailing}>{trailing}</div> : null}
    </div>
  );
}

export function Content({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  return <div className={cn(styles.content, className)} {...props} />;
}

export function Footer({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  return <div className={cn(styles.footer, className)} {...props} />;
}
