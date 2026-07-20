import { Button } from "@pond/ui";
import { formatBytes, formatNumber } from "@/lib/util/format";
import type { MockSave, MockSaves } from "./lib/mock";
import { groupRows, MockThumb, timeAgo } from "./lib/shared";
import styles from "./variant-downloads.module.css";

/** Prototype D: downloads manager. One flat card, progress is the hero, a summary footer totals the session. */

function Row({ save, saves }: { save: MockSave; saves: MockSaves }) {
  return (
    <div className={styles.row} data-status={save.status}>
      <MockThumb save={save} size={36} />
      <span className={styles.body}>
        <span className={styles.top}>
          <span className={styles.title}>{save.title}</span>
          <span className={styles.right}>
            {save.status === "saving" ? (
              <span className={styles.pct}>
                {Math.round(save.progress * 100)}%
              </span>
            ) : save.status === "failed" ? (
              <Button
                variant="secondary"
                size="xs"
                onClick={() => saves.retry(save.id)}
              >
                Retry
              </Button>
            ) : (
              <span className={styles.when}>{timeAgo(save)}</span>
            )}
          </span>
        </span>

        {save.status === "saving" ? (
          <span className={styles.track} aria-hidden>
            <span
              className={styles.fill}
              style={{ transform: `scaleX(${save.progress})` }}
            />
          </span>
        ) : null}

        <span className={styles.sub}>
          {save.status === "saving" ? (
            save.stage
          ) : save.status === "failed" ? (
            <span className={styles.error}>{save.error}</span>
          ) : (
            [save.source, save.size != null ? formatBytes(save.size) : null]
              .filter(Boolean)
              .join(" · ")
          )}
        </span>
      </span>
    </div>
  );
}

export function VariantDownloads({ saves }: { saves: MockSaves }) {
  const { failed, saving, saved } = groupRows(saves.rows);
  const ordered = [...saving, ...failed, ...saved];

  const totalBytes = saved.reduce((sum, s) => sum + (s.size ?? 0), 0);

  if (ordered.length === 0) {
    return (
      <p className={styles.empty}>
        Items you save appear here while they land in your library.
      </p>
    );
  }

  return (
    <div className={styles.root}>
      <div className={styles.card}>
        {ordered.map((save) => (
          <Row key={save.id} save={save} saves={saves} />
        ))}
        <footer className={styles.footer}>
          <span>
            {saving.length > 0
              ? `${formatNumber(saving.length)} saving`
              : `${formatNumber(saved.length)} saved · ${formatBytes(totalBytes)}`}
            {failed.length > 0
              ? ` · ${formatNumber(failed.length)} failed`
              : ""}
          </span>
          <span className={styles.footerActions}>
            {saving.length > 0 ? (
              <button
                type="button"
                className={styles.footerButton}
                onClick={saves.stopAll}
              >
                Stop all
              </button>
            ) : null}
            {saved.length > 0 ? (
              <button
                type="button"
                className={styles.footerButton}
                onClick={saves.clearFinished}
              >
                Clear
              </button>
            ) : null}
          </span>
        </footer>
      </div>
    </div>
  );
}
