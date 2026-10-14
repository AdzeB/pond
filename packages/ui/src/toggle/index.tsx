import { Toggle as Base } from "@base-ui/react/toggle";
import { clsx as cn } from "clsx";
import styles from "./styles.module.css";

export interface ToggleProps extends Base.Props {
  size?: "sm" | "md";
  variant?: "ghost" | "outline";
}

export function Toggle({
  className,
  size = "md",
  variant = "ghost",
  ...props
}: ToggleProps) {
  return (
    <Base
      data-size={size}
      data-variant={variant}
      className={cn(styles.root, className)}
      {...props}
    />
  );
}
