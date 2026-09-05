import { IconPlusOutline18, IconXmarkOutline18 } from "@pond/icons/outline/18";
import { Button } from "@pond/ui";
import type { AssistantSource } from "@shared/assistant";
import { useEffect, useId, useRef } from "react";
import styles from "./reference-board.module.css";
import { useSourceCovers } from "./save-preview";
import { SaveReferenceCard } from "./save-reference-card";

export function ReferenceBoard({
  sources,
  attachedIds,
  onOpenSave,
  onAttach,
  onClose,
  autoFocus = true,
}: {
  sources: AssistantSource[];
  attachedIds: string[];
  onOpenSave: (id: string) => void;
  onAttach: (sources: AssistantSource[]) => void;
  onClose: () => void;
  autoFocus?: boolean;
}) {
  const heading = useId();
  const closeButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (autoFocus) closeButton.current?.focus();
  }, [autoFocus]);
  const saves = [
    ...new Map(sources.map((source) => [source.id, source])).values(),
  ];
  useSourceCovers(saves.map((source) => source.id));
  return (
    <aside
      className={styles.board}
      aria-labelledby={heading}
      onKeyDown={(event) => {
        if (event.key !== "Escape") return;
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }}
    >
      <header className={styles.header}>
        <div>
          <h2 id={heading}>References</h2>
          <p>
            {saves.length}{" "}
            {saves.length === 1
              ? "Save consulted for this answer"
              : "Saves consulted for this answer"}
          </p>
        </div>
        <Button
          ref={closeButton}
          icon
          size="sm"
          variant="ghost"
          aria-label="Close References"
          onClick={onClose}
        >
          <IconXmarkOutline18 />
        </Button>
      </header>
      <div className={styles.content}>
        <div className={styles.grid}>
          {saves.map((source) => (
            <SaveReferenceCard
              key={source.id}
              source={source}
              attached={attachedIds.includes(source.id)}
              onOpenSave={onOpenSave}
              onAttach={onAttach}
            />
          ))}
        </div>
      </div>
      <footer className={styles.footer}>
        <Button
          size="sm"
          variant="ghost"
          disabled={
            !saves.length ||
            saves.every((save) => attachedIds.includes(save.id))
          }
          onClick={() => onAttach(saves)}
        >
          <IconPlusOutline18 />
          Use These Saves
        </Button>
      </footer>
    </aside>
  );
}
