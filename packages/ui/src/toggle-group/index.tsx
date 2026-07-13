import { ToggleGroup as Base } from "@base-ui/react/toggle-group";
import { clsx as cn } from "clsx";
import styles from "./styles.module.css";

/**
 * Segmented control track for Toggles sharing pressed state; single-select by default, `multiple` for independent toggles.
 * The marker attribute lets the Toggle stylesheet restyle its items.
 */
export function ToggleGroup({ className, ...props }: Base.Props) {
  return (
    <Base
      data-pond-toggle-group=""
      className={cn(styles.root, className)}
      {...props}
    />
  );
}
