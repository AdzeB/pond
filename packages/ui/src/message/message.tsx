import { clsx as cn } from "clsx";
import { useReducedMotionConfig } from "motion/react";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import styles from "./styles.module.css";

interface RootProps extends ComponentPropsWithoutRef<"article"> {
  role: "user" | "assistant" | "system";
}

function Root({ className, role, ...props }: RootProps) {
  const reduced = useReducedMotionConfig();
  return (
    <article
      {...props}
      data-reduced-motion={reduced || undefined}
      data-role={role}
      className={cn(styles.message, className)}
    />
  );
}

function Body({ className, ...props }: ComponentPropsWithoutRef<"div">) {
  return <div className={cn(styles["message-body"], className)} {...props} />;
}

function Leading({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return <div className={styles.leading}>{children}</div>;
}

function Footer({ children }: { children?: ReactNode }) {
  return children ? children : null;
}

function Actions({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return <div className={styles["message-actions"]}>{children}</div>;
}

export const Message = { Root, Body, Leading, Footer, Actions };
