import { IconXmarkOutline12 } from "@pond/icons/outline/12";
import { clsx as cn } from "clsx";
import type { ComponentPropsWithoutRef } from "react";
import { Button, type ButtonProps } from "../button";
import styles from "./styles.module.css";

export type ChipTone = "mention" | "tag";

interface RootProps extends ComponentPropsWithoutRef<"div"> {}

function Root({ className, ...props }: RootProps) {
  return <div className={cn(styles.root, className)} {...props} />;
}

interface ItemProps extends ComponentPropsWithoutRef<"div"> {
  kind?: "field" | "value";
  tone?: ChipTone;
  selected?: boolean;
}

function Item({ className, kind, tone, selected, ...props }: ItemProps) {
  return (
    <div
      className={cn(styles.item, className)}
      data-kind={kind === "value" ? "value" : undefined}
      data-tone={tone}
      data-selected={selected || undefined}
      {...props}
    />
  );
}

interface IconProps extends ComponentPropsWithoutRef<"span"> {}

function Icon({ className, ...props }: IconProps) {
  return <span className={cn(styles.icon, className)} aria-hidden {...props} />;
}

interface LabelProps extends ComponentPropsWithoutRef<"span"> {}

function Label({ className, ...props }: LabelProps) {
  return <span className={cn(styles.label, className)} {...props} />;
}

function Operator({
  className,
  size = "xs",
  variant = "ghost",
  ...props
}: ButtonProps) {
  return (
    <Button
      size={size}
      variant={variant}
      className={cn(styles.operator, className)}
      {...props}
    />
  );
}

function Trigger({
  className,
  size = "sm",
  variant = "ghost",
  ...props
}: ButtonProps) {
  return (
    <Button
      size={size}
      variant={variant}
      className={cn(styles.trigger, className)}
      {...props}
    />
  );
}

function Clear({ className, children, ...props }: ButtonProps) {
  return (
    <Button
      icon
      size="xs"
      variant="ghost"
      className={cn(styles.clear, className)}
      {...props}
    >
      {children ?? <IconXmarkOutline12 />}
    </Button>
  );
}

export const Chip = {
  Root,
  Item,
  Icon,
  Label,
  Operator,
  Trigger,
  Clear,
};
