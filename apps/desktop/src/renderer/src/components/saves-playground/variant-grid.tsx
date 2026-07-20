import { Button } from "@pond/ui";
import { formatNumber } from "@/lib/util/format";
import type { MockSave, MockSaves } from "./lib/mock";
import { groupRows, timeAgo } from "./lib/shared";
import styles from "./variant-grid.module.css";

/** Prototype I: in-place grid. Saves appear where they'll live; in-flight items carry a progress ring on the tile itself. */

function Ring({ progress }: { progress: number }) {
  const r = 14;
  const c = 2 * Math.PI * r;
  return (
    <svg
      width="36"
      height="36"
      viewBox="0 0 36 36"
      role="img"
      aria-label="Saving progress"
    >
      <circle
        cx="18"
        cy="18"
        r={r}
        fill="none"
        stroke="rgb(255 255 255 / 35%)"
        strokeWidth="3"
      />
      <circle
        cx="18"
        cy="18"
        r={r}
        fill="none"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - progress)}
        transform="rotate(-90 18 18)"
        className={styles.ringFill}
      />
    </svg>
  );
}

function Tile({ save, saves }: { save: MockSave; saves: MockSaves }) {
  return (
    <figure className={styles.tile} data-status={save.status}>
      <span
        className={styles.art}
        style={{
          background: `linear-gradient(135deg, oklch(0.82 0.09 ${save.hue}), oklch(0.62 0.13 ${save.hue + 40}))`,
        }}
      >
        {save.status === "saving" ? (
          <span className={styles.veil}>
            <Ring progress={save.progress} />
            <span className={styles.stage}>{save.stage}</span>
          </span>
        ) : null}
        {save.status === "failed" ? (
          <span className={styles.veil} data-tone="error">
            <span className={styles.failWord}>Didn't land</span>
            <Button
              variant="secondary"
              size="xs"
              onClick={() => saves.retry(save.id)}
            >
              Retry
            </Button>
          </span>
        ) : null}
      </span>
      <figcaption className={styles.caption}>
        <span className={styles.captionTitle}>{save.title}</span>
        <span
          className={styles.captionSub}
          data-tone={save.status === "failed" ? "error" : undefined}
        >
          {save.status === "saving"
            ? `${Math.round(save.progress * 100)}%`
            : save.status === "failed"
              ? save.error
              : `${save.source} · ${timeAgo(save)}`}
        </span>
      </figcaption>
    </figure>
  );
}

export function VariantGrid({ saves }: { saves: MockSaves }) {
  const { failed, saving, saved } = groupRows(saves.rows);
  const ordered = [...saving, ...failed, ...saved];

  if (ordered.length === 0) {
    return (
      <p className={styles.empty}>
        Items you save appear here while they land in your library.
      </p>
    );
  }

  return (
    <div className={styles.root}>
      {failed.length > 0 ? (
        <div className={styles.note}>
          {formatNumber(failed.length)} {failed.length === 1 ? "save" : "saves"}{" "}
          didn't land.
          <button
            type="button"
            className={styles.noteAction}
            onClick={saves.retryAll}
          >
            Retry all
          </button>
        </div>
      ) : null}
      <div className={styles.grid}>
        {ordered.map((save) => (
          <Tile key={save.id} save={save} saves={saves} />
        ))}
      </div>
    </div>
  );
}
