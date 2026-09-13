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
    <fieldset className={styles["option-group"]}>
      <legend className={styles["group-label"]}>{label}</legend>
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
      {icon && <span className={styles["option-icon"]}>{icon}</span>}
      <span className={styles["option-label"]}>{children}</span>
      {description && (
        <span className={styles["option-description"]}>{description}</span>
      )}
      {trailing && <span className={styles.trailing}>{trailing}</span>}
    </Button>
  );
}

export const ComposerOptions = { Group: OptionGroup, Item: OptionItem };
