import { clsx as cn } from "clsx";
import type { ComponentProps } from "react";
import { Button, type ButtonProps } from "../../button";
import styles from "./styles.module.css";

function Root({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn(styles.root, className)} {...props} />;
}

function Item({ className, ...props }: ComponentProps<"span">) {
  return <span className={cn(styles.item, className)} {...props} />;
}

function Thumb({ className, ...props }: ComponentProps<"span">) {
  return <span className={cn(styles.thumb, className)} {...props} />;
}

function Label({ className, ...props }: ComponentProps<"span">) {
  return <span className={cn(styles.label, className)} {...props} />;
}

function Remove({
  className,
  variant = "ghost",
  size = "xs",
  icon = true,
  ...props
}: ButtonProps) {
  return (
    <Button
      variant={variant}
      size={size}
      icon={icon}
      className={cn(styles.remove, className)}
      {...props}
    />
  );
}

export const Attachments = { Root, Item, Thumb, Label, Remove };
