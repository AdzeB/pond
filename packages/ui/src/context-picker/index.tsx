import { IconCheckOutline18, IconFileOutline18 } from "@pond/icons/outline/18";
import { useState } from "react";
import { Button } from "../button";
import { Input } from "../input";
import type { ReferenceItem } from "../reference-list";
import styles from "./styles.module.css";

export function ContextPicker({
  items,
  selectedIds,
  onSelectedIdsChange,
}: {
  items: ReferenceItem[];
  selectedIds: readonly string[];
  onSelectedIdsChange: (ids: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const visible = items.filter((item) =>
    `${item.title} ${item.meta ?? ""}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  return (
    <div className={styles.contextPicker}>
      <Input.Root size="sm">
        <Input.Field
          aria-label="Search context"
          placeholder="Search your Saves…"
          value={query}
          onValueChange={setQuery}
        />
      </Input.Root>
      <fieldset className={styles.pickerList} aria-label="Context">
        {visible.length ? (
          visible.map((item) => (
            <Button
              key={item.id}
              variant="ghost"
              className={styles.contextRow}
              aria-label={item.title}
              aria-pressed={selectedIds.includes(item.id)}
              onClick={() =>
                onSelectedIdsChange(
                  selectedIds.includes(item.id)
                    ? selectedIds.filter((id) => id !== item.id)
                    : [...selectedIds, item.id],
                )
              }
            >
              <span className={styles.referenceMedia}>
                {item.media ?? <IconFileOutline18 />}
              </span>
              <span className={styles.modelContent}>
                <span className={styles.modelName}>{item.title}</span>
                <span className={styles.rowDescription}>{item.meta}</span>
              </span>
              <span className={styles.selectionMark}>
                {selectedIds.includes(item.id) && <IconCheckOutline18 />}
              </span>
            </Button>
          ))
        ) : (
          <div className={styles.pickerEmpty}>No matching Saves</div>
        )}
      </fieldset>
      <div className={styles.pickerFooter} aria-live="polite">
        {selectedIds.length} selected
        {selectedIds.length > 0 && (
          <Button
            variant="ghost"
            size="xs"
            onClick={() => onSelectedIdsChange([])}
          >
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}
