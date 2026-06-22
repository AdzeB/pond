import { useMemo } from "react";
import { useRelatedSaves } from "@/hooks/use-related-saves";
import { initials } from "@/lib/initials";
import { pickPrimaryUnit } from "@/lib/media";
import type { Save } from "@/lib/types";
import { primarySelection } from "@/stores/selection";
import styles from "./styles.module.css";

export function Related({ id }: { id: string }) {
  const related = useRelatedSaves(id);

  if (related.length === 0) {
    return (
      <p className={styles.relatedEmpty}>
        No related saves yet. Related items appear once semantic or visual
        embeddings have been built for your library.
      </p>
    );
  }

  return (
    <div className={styles.relatedGrid}>
      {related.map(({ save, score }) => (
        <RelatedCard key={save.id} save={save} score={score} />
      ))}
    </div>
  );
}

function RelatedCard({ save, score }: { save: Save; score: number }) {
  const unit = useMemo(() => pickPrimaryUnit(save), [save]);
  const label = save.title ?? save.author ?? "Untitled";
  const thumb = unit && !unit.isVideo ? unit.url : unit?.posterUrl;

  return (
    <button
      type="button"
      className={styles.relatedCard}
      title={`${label} · ${Math.round(score * 100)}% match`}
      onClick={() => primarySelection.set(save.id)}
    >
      <span className={styles.relatedThumb}>
        {thumb ? (
          <img
            src={thumb}
            alt=""
            className={styles.relatedImg}
            loading="lazy"
            decoding="async"
            draggable={false}
          />
        ) : (
          <span className={styles.relatedFallback} aria-hidden>
            {initials(label)}
          </span>
        )}
      </span>
      <span className={styles.relatedLabel}>{label}</span>
    </button>
  );
}
