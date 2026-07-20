import { Button } from "@pond/ui";
import { formatBytes, formatNumber } from "@/lib/util/format";
import type { MockSave, MockSaves } from "./lib/mock";
import { groupRows, MockThumb, savedMeta, timeAgo } from "./lib/shared";
import styles from "./variant-banner.module.css";

/** Prototype G: session manager. An AWS-style aggregate banner owns the session; rows underneath are pure status. */

function Banner({ saves }: { saves: MockSaves }) {
  const { failed, saving, saved } = groupRows(saves.rows);

  if (saving.length > 0) {
    const overall =
      saving.reduce((sum, s) => sum + s.progress, 0) / saving.length;
    return (
      <div className={styles.banner} data-tone="run">
        <span className={styles.bannerText}>
          <span className={styles.bannerTitle}>
            Saving {formatNumber(saving.length)}{" "}
            {saving.length === 1 ? "item" : "items"}
          </span>
          <span className={styles.bannerSub}>
            {Math.round(overall * 100)}% overall
            {failed.length > 0
              ? ` · ${formatNumber(failed.length)} failed so far`
              : ""}
          </span>
        </span>
        <span className={styles.bannerTrack} aria-hidden>
          <span
            className={styles.bannerFill}
            style={{ transform: `scaleX(${overall})` }}
          />
        </span>
        <Button variant="secondary" size="sm" onClick={saves.stopAll}>
          Stop all
        </Button>
      </div>
    );
  }

  if (failed.length > 0) {
    return (
      <div className={styles.banner} data-tone="warn">
        <span className={styles.bannerText}>
          <span className={styles.bannerTitle}>
            {formatNumber(failed.length)}{" "}
            {failed.length === 1 ? "save" : "saves"} didn't land
          </span>
          <span className={styles.bannerSub}>
            {saved.length > 0
              ? `${formatNumber(saved.length)} saved fine this session.`
              : "Retry, or open one for details."}
          </span>
        </span>
        <Button variant="secondary" size="sm" onClick={saves.retryAll}>
          Retry all
        </Button>
      </div>
    );
  }

  return (
    <div className={styles.banner} data-tone="ok">
      <span className={styles.bannerText}>
        <span className={styles.bannerTitle}>All caught up</span>
        <span className={styles.bannerSub}>
          {saved.length > 0
            ? `${formatNumber(saved.length)} saved this session · ${formatBytes(
                saved.reduce((sum, s) => sum + (s.size ?? 0), 0),
              )}`
            : "Everything you save lands quietly in your library."}
        </span>
      </span>
      {saved.length > 0 ? (
        <Button variant="secondary" size="sm" onClick={saves.clearFinished}>
          Clear
        </Button>
      ) : null}
    </div>
  );
}

function Row({ save, saves }: { save: MockSave; saves: MockSaves }) {
  return (
    <div className={styles.row}>
      <MockThumb save={save} size={24} />
      <span className={styles.name}>{save.title}</span>
      <span className={styles.meta}>
        {save.status === "saving"
          ? save.stage
          : save.status === "failed"
            ? save.error
            : savedMeta(save)}
      </span>
      <span className={styles.status}>
        {save.status === "saving" ? (
          <span className={styles.pct}>{Math.round(save.progress * 100)}%</span>
        ) : save.status === "failed" ? (
          <Button
            variant="secondary"
            size="xs"
            onClick={() => saves.retry(save.id)}
          >
            Retry
          </Button>
        ) : (
          <span className={styles.done}>
            <span className={styles.check} aria-hidden>
              ✓
            </span>
            {timeAgo(save)}
          </span>
        )}
      </span>
    </div>
  );
}

export function VariantBanner({ saves }: { saves: MockSaves }) {
  const { failed, saving, saved } = groupRows(saves.rows);
  const ordered = [...saving, ...failed, ...saved];

  return (
    <div className={styles.root}>
      <Banner saves={saves} />
      {ordered.length > 0 ? (
        <div className={styles.list}>
          {ordered.map((save) => (
            <Row key={save.id} save={save} saves={saves} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
