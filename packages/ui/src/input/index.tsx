import { Input as Base } from "@base-ui/react/input";
import { clsx as cn } from "clsx";
import styles from "./styles.module.css";

type InputSize = "xs" | "sm" | "md" | "lg" | "xl";
type InputVariant = "primary" | "secondary";

function Root({
  className,
  size = "md",
  variant = "primary",
  ...props
}: React.ComponentProps<"div"> & { size?: InputSize; variant?: InputVariant }) {
  return (
    <div
      data-slot="root"
      data-size={size}
      data-variant={variant}
      className={cn(styles.root, className)}
      {...props}
    />
  );
}

function Icon({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="icon"
      aria-hidden="true"
      className={cn(styles.icon, className)}
      {...props}
    />
  );
}

function Field({ className, ...props }: Base.Props) {
  return (
    <Base
      data-slot="field"
      className={cn(styles.field, className)}
      {...props}
    />
  );
}

export const Input = { Root, Icon, Field };
