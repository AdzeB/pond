import { clsx as cn } from "clsx";
import type { ComponentProps } from "react";
import styles from "./styles.module.css";

function Root({ className, ...props }: ComponentProps<"span">) {
  return <span className={cn(styles.root, className)} {...props} />;
}

export const Shimmer = { Root };
