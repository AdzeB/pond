import { Button as Base } from "@base-ui/react/button";
import { clsx as cn } from "clsx";
import styles from "./styles.module.css";

export interface ButtonProps extends Base.Props {
  variant?:
    | "primary"
    | "secondary"
    | "tertiary"
    | "ghost"
    | "accent"
    | "destructive"
    | "link";
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  rounding?: "pill" | "rounded";
  icon?: boolean;
  width?: "full" | "auto";
}

export function Button({
  className,
  variant = "primary",
  size = "md",
  rounding = "pill",
  width = "auto",
  icon,
  ...props
}: ButtonProps) {
  return (
    <Base
      data-width={width}
      data-variant={variant}
      data-size={size}
      data-rounding={rounding}
      data-icon={icon ? "" : undefined}
      className={cn(styles.root, className)}
      {...props}
    />
  );
}
