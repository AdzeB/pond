import { clsx as cn } from "clsx";
import type React from "react";
import styles from "./styles.module.css";

interface HeaderProps extends React.ComponentPropsWithoutRef<"div"> {
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
}

export function Header({ leading, trailing, children, ...props }: HeaderProps) {
  return (
    <div className={cn(styles.header, props.className)} {...props}>
      <div className={styles.trailing}>{trailing}</div>
      {children}
      <div className={styles.leading}>{leading}</div>
    </div>
  );
}

export function Content(props: React.ComponentPropsWithoutRef<"div">) {
  return <div className={cn(styles.content, props.className)} {...props} />;
}

export function Footer(props: React.ComponentPropsWithoutRef<"div">) {
  return <div className={cn(styles.footer, props.className)} {...props} />;
}
