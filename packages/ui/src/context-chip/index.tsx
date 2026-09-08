import { IconFileOutline18, IconXmarkOutline18 } from "@pond/icons/outline/18";
import type { ReactNode } from "react";
import { Button } from "../button";
import type { ReferenceItem } from "../reference-list";
import { Reveal } from "../reveal";
import styles from "./styles.module.css";

export function ContextChip({
  children,
  onRemove,
  icon = <IconFileOutline18 />,
}: {
  children: string;
  onRemove: () => void;
  icon?: ReactNode;
}) {
  return (
    <span className={styles.contextChip}>
      {icon}
      <span>{children}</span>
      <Button
        variant="ghost"
        size="xs"
        icon
        aria-label={`Remove ${children}`}
        onClick={onRemove}
      >
        <IconXmarkOutline18 />
      </Button>
    </span>
  );
}

export function ContextChips({
  items,
  onRemove,
}: {
  items: ReferenceItem[];
  onRemove: (id: string) => void;
}) {
  return (
    <Reveal visible={items.length > 0}>
      <div className={styles.chips}>
        {items.map((item) => (
          <ContextChip key={item.id} onRemove={() => onRemove(item.id)}>
            {item.title}
          </ContextChip>
        ))}
      </div>
    </Reveal>
  );
}
