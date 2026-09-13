import { clsx as cn } from "clsx";
import type { ComponentProps } from "react";
import styles from "./styles.module.css";

function Root({ className, ...props }: ComponentProps<"button">) {
  return (
    <button type="button" className={cn(styles.root, className)} {...props} />
  );
}

function Count({ className, ...props }: ComponentProps<"span">) {
  return <span className={cn(styles.count, className)} {...props} />;
}

export const Suggestion = { Root, Count };
