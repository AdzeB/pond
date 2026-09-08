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
  if (!items.length) return <div className={styles.pickerEmpty}>{empty}</div>;
  return (
    <div className={styles.referenceList}>
      {items.map((item) => (
        <article key={item.id} className={styles.referenceRow}>
          <Button
            variant="ghost"
            className={styles.referenceOpen}
            aria-label={`Open ${item.title}`}
            onClick={() => onOpen(item)}
          >
            <span className={styles.referenceMedia}>
              {item.media ?? <IconLink2Outline18 />}
            </span>
            <span className={styles.modelContent}>
              <span className={styles.modelName}>{item.title}</span>
              {item.meta && (
                <span className={styles.rowDescription}>{item.meta}</span>
              )}
              {item.description && (
                <span className={styles.referenceDescription}>
                  {item.description}
                </span>
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
