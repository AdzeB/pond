import { Button as Base } from "@base-ui/react/button";
import { clsx as cn } from "clsx";
import styles from "./styles.module.css";

export interface ButtonProps extends Base.Props {
  variant?:
    | "primary"
    | "secondary"
    | "tertiary"
    | "ghost"
    | "destructive"
    | "link";
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  icon?: boolean;
}

export function Button({
  className,
  variant = "primary",
  size = "md",
  icon,
  ...props
}: ButtonProps) {
  return (
    <Base
      data-variant={variant}
      data-size={size}
      data-icon={icon ? "" : undefined}
      className={cn(styles.root, className)}
      {...props}
    />
  );
}
