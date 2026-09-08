import { IconChevronDownOutline18 } from "@pond/icons/outline/18";
import { Button, Reveal } from "@pond/ui";
import type { AssistantResultSet, AssistantSource } from "@shared/assistant";
import { useId, useState } from "react";
import styles from "./inline.module.css";
import { useSourceCovers } from "./save-preview";
import { SaveReferenceCard } from "./save-reference-card";

export function ResultSet({
  result,
  sources,
  attachedIds = [],
  onOpenSave,
  onAttach,
}: {
  result: AssistantResultSet;
  sources: AssistantSource[];
  attachedIds?: string[];
  onOpenSave: (id: string) => void;
  onAttach: (sources: AssistantSource[]) => void;
}) {
  const heading = useId();
  const [expanded, setExpanded] = useState(false);
  const byId = new Map(sources.map((source) => [source.id, source]));
  const saves = [...new Set(result.saveIds)].flatMap(
    (id) => byId.get(id) ?? [],
  );
  const visible = expanded ? saves : saves.slice(0, 4);
  useSourceCovers(visible.map((save) => save.id));
  if (!saves.length) return null;
  return (
    <section className={styles.results} aria-labelledby={heading}>
      <h3 id={heading} className={styles["results-label"]}>
        {result.title}
      </h3>
      <div>
        {saves.map((source, index) => (
          <Reveal key={source.id} visible={expanded || index < 4}>
            <SaveReferenceCard
              source={source}
              attached={attachedIds.includes(source.id)}
              onOpenSave={onOpenSave}
              onAttach={onAttach}
            />
          </Reveal>
        ))}
      </div>
      {saves.length > 4 ? (
        <div className={styles["results-footer"]}>
          <Button
            size="xs"
            variant="ghost"
            aria-expanded={expanded}
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? "Show Less" : `View All ${saves.length} Saves`}
            <IconChevronDownOutline18 />
          </Button>
        </div>
      ) : null}
    </section>
  );
}
