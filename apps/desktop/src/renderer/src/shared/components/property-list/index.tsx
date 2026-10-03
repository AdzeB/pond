import { clsx as cn } from "clsx";
import type { ComponentPropsWithoutRef } from "react";
import styles from "./styles.module.css";

interface RootProps extends ComponentPropsWithoutRef<"div"> {}

function Root({ className, ...props }: RootProps) {
  return <div className={cn(styles.root, className)} {...props} />;
}

interface RowProps extends ComponentPropsWithoutRef<"div"> {}

function Row({ className, ...props }: RowProps) {
  return <div className={cn(styles.row, className)} {...props} />;
}

interface LabelProps extends ComponentPropsWithoutRef<"span"> {}

function Label({ className, ...props }: LabelProps) {
  return <span className={cn(styles.label, className)} {...props} />;
}

interface ValueProps extends ComponentPropsWithoutRef<"span"> {}

function Value({ className, ...props }: ValueProps) {
  return <span className={cn(styles.value, className)} {...props} />;
}

export const PropertyList = { Root, Row, Label, Value };
