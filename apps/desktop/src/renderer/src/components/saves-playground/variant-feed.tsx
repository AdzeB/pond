import { Button } from "@pond/ui";
import type { MockSave, MockSaves } from "./lib/mock";
import { MockThumb, savedMeta, timeAgo } from "./lib/shared";
import styles from "./variant-feed.module.css";

/** Prototype C: one chronological feed. No sections; status is carried inside each row like a quiet activity log. */

function rank(save: MockSave): number {
  if (save.status === "saving") return 0;
  if (save.status === "failed") return 1;
  return 2;
}

function Row({ save, saves }: { save: MockSave; saves: MockSaves }) {
  return (
    <div className={styles.row} data-status={save.status}>
      <span className={styles.gutter}>
        <span className={styles.dot} aria-hidden />
        <span className={styles.line} aria-hidden />
      </span>
      <MockThumb save={save} size={28} />
      <span className={styles.text}>
        <span className={styles.title}>{save.title}</span>
        <span className={styles.sub}>
          {save.status === "saving" ? (
            <>
              {save.stage}
              <span className={styles.subDim}>
                {" "}
                · {Math.round(save.progress * 100)}%
              </span>
            </>
          ) : save.status === "failed" ? (
            <span className={styles.error}>{save.error}</span>
          ) : (
            <>
              Saved <span className={styles.subDim}>· {savedMeta(save)}</span>
            </>
          )}
        </span>
      </span>
      <span className={styles.end}>
        {save.status === "failed" ? (
          <Button
            variant="secondary"
            size="xs"
            onClick={() => saves.retry(save.id)}
          >
            Retry
          </Button>
        ) : save.status === "saved" ? (
          <span className={styles.when}>{timeAgo(save)}</span>
        ) : null}
      </span>
    </div>
  );
}

export function VariantFeed({ saves }: { saves: MockSaves }) {
  const rows = [...saves.rows].sort((a, b) => {
    const r = rank(a) - rank(b);
    if (r !== 0) return r;
    return (b.completedAt ?? Date.now()) - (a.completedAt ?? Date.now());
  });

  if (rows.length === 0) {
    return (
      <p className={styles.empty}>
        Items you save appear here while they land in your library.
      </p>
    );
  }

  return (
    <div className={styles.root}>
      {rows.map((save) => (
        <Row key={save.id} save={save} saves={saves} />
      ))}
    </div>
  );
}
