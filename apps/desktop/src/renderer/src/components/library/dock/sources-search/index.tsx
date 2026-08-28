import { IconXmarkOutline12 } from "@pond/icons/outline/12";
import { Button } from "@pond/ui";
import { useEffect, useRef } from "react";
import { sourcesFilters, useSourcesFilters } from "@/stores/sources-filters";
import styles from "./styles.module.css";

export function SourcesSearch({ onCollapse }: { onCollapse: () => void }) {
  const filters = useSourcesFilters();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className={styles.wrap}>
      <input
        ref={inputRef}
        className={styles.input}
        value={filters.q}
        spellCheck={false}
        placeholder="Find by name…"
        aria-label="Find by name"
        onChange={(e) => sourcesFilters.setQ(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            onCollapse();
          }
        }}
      />
      {filters.q.trim() ? (
        <Button
          size="xs"
          variant="ghost"
          className={styles.clear}
          onClick={() => sourcesFilters.setQ("")}
        >
          Clear Search
        </Button>
      ) : null}
      <Button
        icon
        size="xs"
        variant="ghost"
        aria-label="Close Search"
        className={styles.close}
        onClick={onCollapse}
      >
        <IconXmarkOutline12 />
      </Button>
    </div>
  );
}
