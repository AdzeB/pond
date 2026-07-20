import { Button } from "@pond/ui";
import type { ReactNode } from "react";
import { formatNumber } from "@/lib/util/format";
import type { MockSave, MockSaves } from "./lib/mock";
import { groupRows, MockThumb, savedMeta, timeAgo } from "./lib/shared";
import styles from "./variant-grouped.module.css";

/** Prototype A: grouped queue. Failed, Saving, Saved sections, each carrying its one action inline. */

function Row({ save, saves }: { save: MockSave; saves: MockSaves }) {
  const sub =
    save.status === "saving"
      ? (save.stage ?? "Queued")
      : save.status === "failed"
        ? (save.error ?? "Something went wrong")
        : savedMeta(save);

  return (
    <div className={styles.row}>
      <MockThumb save={save} />
      <span className={styles.text}>
        <span className={styles.title}>{save.title}</span>
        <span
          className={styles.sub}
          data-tone={save.status === "failed" ? "error" : undefined}
        >
          {sub}
        </span>
      </span>
      <span className={styles.end}>
        {save.status === "saving" ? (
          <>
            <span className={styles.pct}>
              {Math.round(save.progress * 100)}%
            </span>
            <span className={styles.bar} aria-hidden>
              <span
                className={styles.fill}
                style={{ transform: `scaleX(${save.progress})` }}
              />
            </span>
          </>
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
    </div>
  );
}

function Section({
  label,
  count,
  action,
  children,
}: {
  label: string;
  count: number;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className={styles.section}>
      <header className={styles.header}>
        <span className={styles.label}>
          {label}
          <span className={styles.count}>{formatNumber(count)}</span>
        </span>
        {action}
      </header>
      <div className={styles.list}>{children}</div>
    </section>
  );
}

export function VariantGrouped({ saves }: { saves: MockSaves }) {
  const { failed, saving, saved } = groupRows(saves.rows);

  if (saves.rows.length === 0) {
    return (
      <p className={styles.empty}>
        Items you save appear here while they land in your library.
      </p>
    );
  }

  return (
    <div className={styles.root}>
      {failed.length > 0 ? (
        <Section
          label="Failed"
          count={failed.length}
          action={
            <Button variant="tertiary" size="xs" onClick={saves.retryAll}>
              Retry all
            </Button>
          }
        >
          {failed.map((save) => (
            <Row key={save.id} save={save} saves={saves} />
          ))}
        </Section>
      ) : null}

      {saving.length > 0 ? (
        <Section
          label="Saving"
          count={saving.length}
          action={
            <Button variant="tertiary" size="xs" onClick={saves.stopAll}>
              Stop all
            </Button>
          }
        >
          {saving.map((save) => (
            <Row key={save.id} save={save} saves={saves} />
          ))}
        </Section>
      ) : null}

      {saved.length > 0 ? (
        <Section
          label="Saved"
          count={saved.length}
          action={
            <Button variant="tertiary" size="xs" onClick={saves.clearFinished}>
              Clear
            </Button>
          }
        >
          {saved.map((save) => (
            <Row key={save.id} save={save} saves={saves} />
          ))}
        </Section>
      ) : null}
    </div>
  );
}
