import { IconXmarkOutline12 } from "@pond/icons/outline/12";
import { Button } from "@pond/ui";
import { clsx as cn } from "clsx";
import type { ComponentPropsWithoutRef } from "react";
import styles from "./styles.module.css";

interface ListProps extends ComponentPropsWithoutRef<"div"> {}

function List({ className, ...props }: ListProps) {
  return <div className={cn(styles.list, className)} {...props} />;
}

interface ItemProps extends Omit<ComponentPropsWithoutRef<"span">, "children"> {
  label: string;
  count: number;
  total: number;
  removeLabel: string;
  onRemove: () => void;
}

function Item({
  label,
  count,
  total,
  removeLabel,
  onRemove,
  className,
  ...props
}: ItemProps) {
  const mixed = count !== total;
  return (
    <span
      className={cn(styles.item, className)}
      data-mixed={mixed || undefined}
      {...props}
    >
      <span className={styles.label}>
        {mixed ? `${label} (${count}/${total})` : label}
      </span>
      <Button
        icon
        size="xs"
        variant="ghost"
        aria-label={removeLabel}
        onClick={onRemove}
      >
        <IconXmarkOutline12 />
      </Button>
    </span>
  );
}

export const AssignmentChip = { List, Item };
