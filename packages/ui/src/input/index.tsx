import { Input as Base } from "@base-ui/react/input";
import { clsx as cn } from "clsx";
import { forwardRef } from "react";
import { stopPageHotkeys } from "../stop-page-hotkeys";
import styles from "./styles.module.css";

type InputSize = "xs" | "sm" | "md" | "lg" | "xl";
type InputVariant = "primary" | "secondary" | "borderless";

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

function Action({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="action"
      className={cn(styles.action, className)}
      {...props}
    />
  );
}

function Prefix({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="prefix"
      className={cn(styles.affix, className)}
      {...props}
    />
  );
}

function Suffix({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="suffix"
      className={cn(styles.affix, className)}
      {...props}
    />
  );
}

const Field = forwardRef<HTMLInputElement, Base.Props>(function Field(
  { className, onKeyDown, ...props },
  ref,
) {
  return (
    <Base
      {...props}
      ref={ref}
      data-slot="field"
      className={cn(styles.field, className)}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        stopPageHotkeys(event);
      }}
    />
  );
});

const Textarea = forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea"> & {
    onValueChange?: (value: string) => void;
    padding?: "default" | "comfortable";
  }
>(function Textarea(
  {
    className,
    rows = 5,
    onChange,
    onValueChange,
    onKeyDown,
    padding,
    ...props
  },
  ref,
) {
  return (
    <textarea
      {...props}
      ref={ref}
      data-slot="field"
      data-multiline
      data-padding={padding === "comfortable" ? padding : undefined}
      rows={rows}
      className={cn(styles.field, className)}
      onChange={(event) => {
        onChange?.(event);
        onValueChange?.(event.target.value);
      }}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        stopPageHotkeys(event);
      }}
    />
  );
});

export const Input = {
  Root,
  Prefix,
  Suffix,
  Icon,
  Action,
  Field,
  Textarea,
};
