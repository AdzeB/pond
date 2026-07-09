import { Toggle as Base } from "@base-ui/react/toggle";
import { clsx as cn } from "clsx";
import styles from "./styles.module.css";

export interface ToggleProps extends Base.Props {
  size?: "sm" | "md";
}

// Two-state button. Standalone it's a quiet ghost button that fills when
// pressed; inside a ToggleGroup it restyles as a segmented-control item
// (see the group-scoped rules in styles.module.css).
export function Toggle({ className, size = "md", ...props }: ToggleProps) {
  return (
    <Base data-size={size} className={cn(styles.root, className)} {...props} />
  );
}
