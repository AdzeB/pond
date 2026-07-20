import { Button } from "@pond/ui";
import { formatNumber } from "@/lib/util/format";
import type { MockSaves } from "./lib/mock";
import { groupRows, MockThumb } from "./lib/shared";
import styles from "./variant-quiet.module.css";

/** Prototype F: quiet summary. One sentence and a ring; only failures ever earn rows. */

function Ring({ progress }: { progress: number }) {
  const r = 15;
  const c = 2 * Math.PI * r;
  return (
    <svg
      className={styles.ring}
      width="38"
      height="38"
      viewBox="0 0 38 38"
      role="img"
      aria-label="Overall saving progress"
    >
      <circle
        cx="19"
        cy="19"
        r={r}
        fill="none"
        stroke="var(--ds-gray-4)"
        strokeWidth="3"
      />
      <circle
        cx="19"
        cy="19"
        r={r}
        fill="none"
        stroke="var(--ds-accent-9)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - progress)}
        transform="rotate(-90 19 19)"
        className={styles.ringFill}
      />
    </svg>
  );
}

export function VariantQuiet({ saves }: { saves: MockSaves }) {
  const { failed, saving, saved } = groupRows(saves.rows);

  const overall =
    saving.length > 0
      ? saving.reduce((sum, s) => sum + s.progress, 0) / saving.length
      : 1;

  return (
    <div className={styles.root}>
      <div className={styles.summary}>
        {saving.length > 0 ? (
          <Ring progress={overall} />
        ) : (
          <span
            className={styles.mark}
            data-tone={failed.length > 0 ? "warn" : "ok"}
            aria-hidden
          >
            {failed.length > 0 ? "!" : "✓"}
          </span>
        )}
        <span className={styles.summaryText}>
          <span className={styles.line}>
            {saving.length > 0
              ? `Saving ${formatNumber(saving.length)} ${saving.length === 1 ? "item" : "items"}`
              : failed.length > 0
                ? `${formatNumber(failed.length)} ${failed.length === 1 ? "save" : "saves"} didn't land`
                : "All caught up"}
          </span>
          <span className={styles.subline}>
            {saved.length > 0
              ? `${formatNumber(saved.length)} saved this session`
              : "Everything you save lands quietly in your library"}
          </span>
        </span>
      </div>

      {failed.length > 0 ? (
        <div className={styles.failures}>
          {failed.map((save) => (
            <div key={save.id} className={styles.failure}>
              <MockThumb save={save} size={28} />
              <span className={styles.failureText}>
                <span className={styles.failureTitle}>{save.title}</span>
                <span className={styles.failureError}>{save.error}</span>
              </span>
              <Button
                variant="secondary"
                size="xs"
                onClick={() => saves.retry(save.id)}
              >
                Retry
              </Button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
