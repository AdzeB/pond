import { IconCheckOutline18, IconPlusOutline18 } from "@pond/icons/outline/18";
import type { AssistantSource } from "@shared/assistant";
import { sourceExcerpt } from "@shared/assistant-text";
import styles from "./inline.module.css";
import { SourceThumbnail, sourceDomain } from "./save-preview";

export function SaveReferenceCard({
  source,
  attached = false,
  onOpenSave,
  onAttach,
}: {
  source: AssistantSource;
  attached?: boolean;
  onOpenSave: (id: string) => void;
  onAttach: (sources: AssistantSource[]) => void;
}) {
  const title = sourceExcerpt(source.title, 180) || "Untitled";
  return (
    <article className={styles["result-card"]}>
      <button
        type="button"
        className={styles["result-open"]}
        onClick={() => onOpenSave(source.id)}
        aria-label={`Open ${title}`}
      >
        <SourceThumbnail id={source.id} source={source} visual />
        <span className={styles["result-info"]}>
          <strong>{title}</strong>
          <small>{sourceDomain(source)}</small>
        </span>
      </button>
      <button
        type="button"
        className={styles["result-add"]}
        aria-label={`Add ${title} to message`}
        title={attached ? "Added to Message" : "Add to Message"}
        disabled={attached}
        onClick={() => onAttach([source])}
      >
        {attached ? <IconCheckOutline18 /> : <IconPlusOutline18 />}
      </button>
    </article>
  );
}
