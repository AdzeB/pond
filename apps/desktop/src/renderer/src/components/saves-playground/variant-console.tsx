import { Button } from "@pond/ui";
import { useState } from "react";
import { formatNumber } from "@/lib/util/format";
import type { MockSave, MockSaves } from "./lib/mock";
import { stepsFor } from "./lib/mock";
import { groupRows, MockThumb, savedMeta, timeAgo } from "./lib/shared";
import styles from "./variant-console.module.css";

/** Prototype E: pipeline console. Rows expand into the actual op checklist, for people who want to see the machinery. */

function Steps({ save, saves }: { save: MockSave; saves: MockSaves }) {
  return (
    <div className={styles.steps}>
      {stepsFor(save).map((step) => (
        <span key={step.label} className={styles.step} data-state={step.state}>
          <span className={styles.stepMark} aria-hidden>
            {step.state === "done"
              ? "✓"
              : step.state === "failed"
                ? "✕"
                : step.state === "active"
                  ? "•"
                  : "·"}
          </span>
          {step.label}
        </span>
      ))}
      {save.status === "failed" ? (
        <div className={styles.stepsError}>
          <span>{save.error}</span>
          <Button
            variant="secondary"
            size="xs"
            onClick={() => saves.retry(save.id)}
          >
            Retry
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function Row({ save, saves }: { save: MockSave; saves: MockSaves }) {
  const [open, setOpen] = useState(save.status === "failed");
  const expandable = save.status !== "saved";

  return (
    <div className={styles.row} data-status={save.status}>
      <button
        type="button"
        className={styles.head}
        disabled={!expandable}
        onClick={() => setOpen((v) => !v)}
      >
        <span className={styles.statusDot} aria-hidden />
        <MockThumb save={save} size={24} />
        <span className={styles.title}>{save.title}</span>
        <span className={styles.meta}>
          {save.status === "saving" ? (
            <>
              {save.stage}
              <span className={styles.pct}>
                {Math.round(save.progress * 100)}%
              </span>
            </>
          ) : save.status === "failed" ? (
            "Failed"
          ) : (
            <>
              {savedMeta(save)}
              <span className={styles.when}>{timeAgo(save)}</span>
            </>
          )}
        </span>
      </button>
      {expandable && open ? <Steps save={save} saves={saves} /> : null}
    </div>
  );
}

export function VariantConsole({ saves }: { saves: MockSaves }) {
  const { failed, saving, saved } = groupRows(saves.rows);
  const ordered = [...failed, ...saving, ...saved];

  if (ordered.length === 0) {
    return (
      <p className={styles.empty}>
        Items you save appear here while they land in your library.
      </p>
    );
  }

  return (
    <div className={styles.root}>
      <header className={styles.counts}>
        <span className={styles.count} data-tone="run">
          {formatNumber(saving.length)} saving
        </span>
        <span className={styles.count} data-tone="err">
          {formatNumber(failed.length)} failed
        </span>
        <span className={styles.count} data-tone="ok">
          {formatNumber(saved.length)} saved
        </span>
        <span className={styles.countActions}>
          {failed.length > 0 ? (
            <Button variant="tertiary" size="xs" onClick={saves.retryAll}>
              Retry failed
            </Button>
          ) : null}
          {saving.length > 0 ? (
            <Button variant="tertiary" size="xs" onClick={saves.stopAll}>
              Stop all
            </Button>
          ) : null}
        </span>
      </header>

      <div className={styles.list}>
        {ordered.map((save) => (
          <Row key={save.id} save={save} saves={saves} />
        ))}
      </div>
    </div>
  );
}
