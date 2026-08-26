import { Toggle as Base } from "@base-ui/react/toggle";
import { clsx as cn } from "clsx";
import styles from "./styles.module.css";

export interface ToggleProps extends Base.Props {
  size?: "sm" | "md";
}

export function Toggle({ className, size = "md", ...props }: ToggleProps) {
  return (
    <Base data-size={size} className={cn(styles.root, className)} {...props} />
  );
}
