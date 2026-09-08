import { clsx as cn } from "clsx";
import type { ReactNode } from "react";
import { Button, type ButtonProps } from "../button";
import styles from "./styles.module.css";

function OptionGroup({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <fieldset className={styles.optionGroup}>
      <legend className={styles.groupLabel}>{label}</legend>
      {children}
    </fieldset>
  );
}

function OptionItem({
  icon,
  description,
  trailing,
  children,
  className,
  ...props
}: Omit<ButtonProps, "icon"> & {
  icon?: ReactNode;
  description?: string;
  trailing?: ReactNode;
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn(styles.option, className)}
      {...props}
    >
      {icon && <span className={styles.optionIcon}>{icon}</span>}
      <span className={styles.optionLabel}>{children}</span>
      {description && (
        <span className={styles.optionDescription}>{description}</span>
      )}
      {trailing && <span className={styles.trailing}>{trailing}</span>}
    </Button>
  );
}

export const ComposerOptions = { Group: OptionGroup, Item: OptionItem };
