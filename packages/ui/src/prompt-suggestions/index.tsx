import { IconPlusOutline18 } from "@pond/icons/outline/18";
import type { ReactNode } from "react";
import { Button } from "../button";
import styles from "./styles.module.css";

export function PromptSuggestions({
  suggestions,
  onSelect,
}: {
  suggestions: {
    id: string;
    title: string;
    description?: string;
    icon?: ReactNode;
  }[];
  onSelect: (id: string) => void;
}) {
  return (
    <div className={styles.suggestions}>
      {suggestions.map((item) => (
        <Button
          key={item.id}
          variant="ghost"
          className={styles.suggestion}
          onClick={() => onSelect(item.id)}
        >
          {item.icon && <span className={styles.optionIcon}>{item.icon}</span>}
          <span className={styles.modelContent}>
            <span>{item.title}</span>
            {item.description && (
              <span className={styles.rowDescription}>{item.description}</span>
            )}
          </span>
          <IconPlusOutline18 />
        </Button>
      ))}
    </div>
  );
}
