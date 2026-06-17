import { Input as Base } from "@base-ui/react/input";
import { clsx as cn } from "clsx";
import styles from "./styles.module.css";

function Root({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="root" className={cn(styles.root, className)} {...props} />
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
