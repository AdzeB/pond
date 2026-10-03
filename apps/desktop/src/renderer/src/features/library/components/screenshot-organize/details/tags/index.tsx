import { IconXmarkOutline12 } from "@pond/icons/outline/12";
import { Button } from "@pond/ui";
import type { ReactNode } from "react";
import styles from "./styles.module.css";

export function ScreenshotTags({
  tags,
  onRemove,
  children,
}: {
  tags: readonly string[];
  onRemove: (tag: string) => void;
  children?: ReactNode;
}) {
  return (
    <section className={styles.list} aria-label="Screenshot tags">
      {tags.map((tag) => (
        <span key={tag} className={styles.item}>
          <span className={styles.label} title={tag}>
            {tag}
          </span>
          <Button
            icon
            size="xs"
            variant="ghost"
            aria-label={`Remove tag ${tag}`}
            onClick={() => onRemove(tag)}
          >
            <IconXmarkOutline12 />
          </Button>
        </span>
      ))}
      {children}
    </section>
  );
}
