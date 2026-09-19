import { clsx as cn } from "clsx";
import type { ComponentPropsWithoutRef } from "react";
import styles from "./styles.module.css";

interface BadgeProps extends ComponentPropsWithoutRef<"span"> {
  tone?: "neutral" | "positive";
}

export function Badge({ className, tone = "neutral", ...props }: BadgeProps) {
  return (
    <span
      className={cn(styles.badge, className)}
      data-tone={tone === "neutral" ? undefined : tone}
      {...props}
    />
  );
}
