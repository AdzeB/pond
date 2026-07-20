import { Button } from "@pond/ui";
import { useState } from "react";
import { formatNumber } from "@/lib/util/format";
import type { MockSaves } from "./lib/mock";
import { groupRows, MockThumb, savedMeta, timeAgo } from "./lib/shared";
import styles from "./variant-attention.module.css";

/** Prototype B: attention-first. The page is a health answer; failures are cards, everything else folds away. */

export function VariantAttention({ saves }: { saves: MockSaves }) {
  const { failed, saving, saved } = groupRows(saves.rows);
  const [activityOpen, setActivityOpen] = useState(false);

  const healthy = failed.length === 0;

  return (
    <div className={styles.root}>
      <div className={styles.hero} data-tone={healthy ? "ok" : "warn"}>
        <span className={styles.heroDot} aria-hidden />
        <span className={styles.heroText}>
          <span className={styles.heroTitle}>
            {healthy
              ? saving.length > 0
                ? `Saving ${formatNumber(saving.length)} ${saving.length === 1 ? "item" : "items"}`
                : "All caught up"
              : `${formatNumber(failed.length)} ${failed.length === 1 ? "save needs" : "saves need"} attention`}
          </span>
          <span className={styles.heroSub}>
            {healthy
              ? saved.length > 0
                ? `${formatNumber(saved.length)} saved this session. Everything landed.`
                : "Everything you save lands quietly in your library."
              : "These didn't make it into your library. Retry, or open one for details."}
          </span>
        </span>
        {failed.length > 1 ? (
          <Button variant="secondary" size="sm" onClick={saves.retryAll}>
            Retry all
          </Button>
        ) : null}
      </div>

      {failed.length > 0 ? (
        <div className={styles.cards}>
          {failed.map((save) => (
            <div key={save.id} className={styles.card}>
              <MockThumb save={save} size={36} />
              <span className={styles.cardText}>
                <span className={styles.cardTitle}>{save.title}</span>
                <span className={styles.cardError}>{save.error}</span>
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

      {saving.length > 0 ? (
        <section className={styles.saving}>
          {saving.map((save) => (
            <div key={save.id} className={styles.savingRow}>
              <MockThumb save={save} size={24} />
              <span className={styles.savingTitle}>{save.title}</span>
              <span className={styles.savingStage}>{save.stage}</span>
              <span className={styles.track} aria-hidden>
                <span
                  className={styles.trackFill}
                  style={{ transform: `scaleX(${save.progress})` }}
                />
              </span>
            </div>
          ))}
        </section>
      ) : null}

      {saved.length > 0 ? (
        <section className={styles.activity}>
          <button
            type="button"
            className={styles.activityToggle}
            onClick={() => setActivityOpen((v) => !v)}
          >
            <span className={styles.chev} data-open={activityOpen || undefined}>
              ›
            </span>
            Saved this session
            <span className={styles.activityCount}>
              {formatNumber(saved.length)}
            </span>
          </button>
          {activityOpen ? (
            <div className={styles.activityList}>
              {saved.map((save) => (
                <div key={save.id} className={styles.activityRow}>
                  <MockThumb save={save} size={20} />
                  <span className={styles.activityTitle}>{save.title}</span>
                  <span className={styles.activityMeta}>{savedMeta(save)}</span>
                  <span className={styles.activityWhen}>{timeAgo(save)}</span>
                </div>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
