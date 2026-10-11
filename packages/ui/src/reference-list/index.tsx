import {
  IconCheckOutline18,
  IconLink2Outline18,
  IconPlusOutline18,
} from "@pond/icons/outline/18";
import type { ReactNode } from "react";
import { Button } from "../button";
import styles from "./styles.module.css";

export interface ReferenceItem {
  id: string;
  title: string;
  description?: string;
  meta?: string;
  media?: ReactNode;
}

export function ReferenceList({
  items,
  onOpen,
  onAdd,
  addedIds = [],
  empty = "No references for this response",
}: {
  items: ReferenceItem[];
  onOpen: (item: ReferenceItem) => void;
  onAdd?: (item: ReferenceItem) => void;
  addedIds?: readonly string[];
  empty?: string;
}) {
  if (!items.length) return <div className={styles.empty}>{empty}</div>;
  return (
    <div className={styles.list}>
      {items.map((item) => (
        <article key={item.id} className={styles.row}>
          <Button
            variant="ghost"
            className={styles.open}
            aria-label={`Open ${item.title}`}
            onClick={() => onOpen(item)}
          >
            <span className={styles.media}>
              {item.media ?? <IconLink2Outline18 />}
            </span>
            <span className={styles["model-content"]}>
              <span className={styles["model-name"]}>{item.title}</span>
              {item.meta && (
                <span className={styles["row-description"]}>{item.meta}</span>
              )}
              {item.description && (
                <span className={styles.description}>{item.description}</span>
              )}
            </span>
          </Button>
          {onAdd && (
            <Button
              size="xs"
              icon
              variant="ghost"
              aria-label={`${addedIds.includes(item.id) ? "Added" : "Add"} ${item.title}`}
              disabled={addedIds.includes(item.id)}
              onClick={() => onAdd(item)}
            >
              {addedIds.includes(item.id) ? (
                <IconCheckOutline18 />
              ) : (
                <IconPlusOutline18 />
              )}
            </Button>
          )}
        </article>
      ))}
    </div>
  );
}
