import { clsx as cn } from "clsx";
import type { ComponentProps } from "react";
import styles from "./styles.module.css";

function Root({ className, ...props }: ComponentProps<"span">) {
  return (
    <span role="status" className={cn(styles.root, className)} {...props} />
  );
}

function Dots({ className, ...props }: ComponentProps<"span">) {
  return (
    <span className={cn(styles.dots, className)} aria-hidden {...props}>
      <span />
      <span />
      <span />
    </span>
  );
}

export const Loader = { Root, Dots };
