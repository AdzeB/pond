import { clsx as cn } from "clsx";
import type React from "react";
import styles from "./styles.module.css";

function Root({ className, ...props }: React.ComponentPropsWithoutRef<"div">) {
  return <div className={cn(styles.root, className)} {...props} />;
}

function Start({ className, ...props }: React.ComponentPropsWithoutRef<"div">) {
  return <div className={cn(styles.start, className)} {...props} />;
}

function End({ className, ...props }: React.ComponentPropsWithoutRef<"div">) {
  return <div className={cn(styles.end, className)} {...props} />;
}

function Title({ className, ...props }: React.ComponentPropsWithoutRef<"div">) {
  return <div className={cn(styles.title, className)} {...props} />;
}

function Label({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"span">) {
  return <span className={cn(styles.label, className)} {...props} />;
}

function Meta({ className, ...props }: React.ComponentPropsWithoutRef<"span">) {
  return <span className={cn(styles.meta, className)} {...props} />;
}

export const TitleBar = { Root, Start, Title, Label, Meta, End };
