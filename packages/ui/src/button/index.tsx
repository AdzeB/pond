import { Button as Base } from "@base-ui/react/button";
import { clsx as cn } from "clsx";
import styles from "./styles.module.css";

export interface ButtonProps extends Base.Props {
  variant?:
    | "primary"
    | "secondary"
    | "tertiary"
    | "ghost"
    | "text"
    | "accent"
    | "destructive"
    | "link";
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  rounding?: "pill" | "rounded";
  icon?: boolean;
  width?: "full" | "auto";
  loading?: boolean;
}

export function Button({
  className,
  variant = "primary",
  size = "md",
  rounding = "rounded",
  width = "auto",
  icon,
  loading,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <Base
      {...props}
      data-width={width}
      data-variant={variant}
      data-size={size}
      data-rounding={rounding}
      data-icon={icon ? "" : undefined}
      data-loading={loading || undefined}
      disabled={disabled || loading || undefined}
      className={cn(styles.root, className)}
    />
  );
}
