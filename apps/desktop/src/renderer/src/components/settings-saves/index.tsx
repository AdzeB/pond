import { SOURCES, type Source } from "@pond/schema/db";
import { Button, Settings } from "@pond/ui";
import { pickPrimaryUnit } from "@/lib/media/units";
import { withThumbWidth } from "@/lib/media/url";
import { retryFailedSelection } from "@/lib/save/selection";
import { getSourceDef } from "@/lib/save/sources-registry";
import type { Save } from "@/lib/types";
import { formatBytes, formatNumber } from "@/lib/util/format";
import { relativeTimeFromMs } from "@/lib/util/relative-time";
import { type ActivityEntry, useActivityEntries } from "@/stores/activity";
import { primarySelection } from "@/stores/selection";
import { settingsModal } from "@/stores/settings-modal";
import {
  clearAllFinished,
  humanizeError,
  type QueueRow,
  useSaveQueue,
} from "./lib/queue";
import styles from "./styles.module.css";

/** Finished rows beyond this render as a single "and N more" footer note. */
const MAX_DONE_ROWS = 200;

function sourceLabel(save: Save): string {
  return (SOURCES as readonly string[]).includes(save.source)
    ? getSourceDef(save.source as Source).label
    : save.source;
}

function Thumb({ save }: { save: Save }) {
  const unit = pickPrimaryUnit(save);
  if (unit && !unit.isVideo) {
    return (
      <img
        className={styles.thumb}
        src={withThumbWidth(unit.url, 48)}
        alt=""
        loading="lazy"
        draggable={false}
      />
    );
  }
  const color = save.dominantColors?.[0];
  return (
    <span
      className={styles.thumb}
      style={color ? { background: color } : undefined}
    />
  );
}

/** Detail opens in its own modal; the settings dialog closes first so the item isn't revealed underneath it. */
function openSave(id: string): void {
  settingsModal.close();
  primarySelection.set(id);
}

function SaveRow({ row }: { row: QueueRow }) {
  const openable = row.status !== "saving";

  const sub =
    row.status === "saving"
      ? (row.stage ?? "Queued")
      : row.status === "failed"
        ? humanizeError(row.error)
        : [
            sourceLabel(row.save),
            row.size != null ? formatBytes(row.size) : null,
          ]
            .filter(Boolean)
            .join(" · ");

  const body = (
    <>
      <Thumb save={row.save} />
      <span className={styles["row-title"]}>{row.name}</span>
      <span
        className={styles["row-sub"]}
        data-tone={row.status === "failed" ? "error" : undefined}
      >
        {sub}
      </span>
    </>
  );

  return (
    <li className={styles.row} data-status={row.status}>
      {openable ? (
        <button
          type="button"
          className={styles["row-main"]}
          title={row.save.url}
          onClick={() => openSave(row.save.id)}
        >
          {body}
        </button>
      ) : (
        <span className={styles["row-main"]}>{body}</span>
      )}

      <span className={styles["row-end"]}>
        {row.status === "saving" ? (
          <>
            <span className={styles.pct}>
              {Math.round(row.progress * 100)}%
            </span>
            <span className={styles.bar} aria-hidden>
              <span
                className={styles["bar-fill"]}
                style={{ transform: `scaleX(${row.progress})` }}
              />
            </span>
          </>
        ) : row.status === "failed" ? (
          <Button
            variant="secondary"
            size="xs"
            onClick={() => void retryFailedSelection([row.save.id])}
          >
            Retry
          </Button>
        ) : (
          <span className={styles.when}>
            {relativeTimeFromMs(row.save.ingestCompletedAt ?? null, "")}
          </span>
        )}
      </span>
    </li>
  );
}

function ActivityRow({ entry }: { entry: ActivityEntry }) {
  return (
    <li className={styles.row} data-status={entry.state}>
      <span className={styles["row-main"]}>
        <span
          className={styles["activity-dot"]}
          data-state={entry.state}
          aria-hidden
        />
        <span className={styles["row-title"]}>{entry.label}</span>
        <span
          className={styles["row-sub"]}
          data-tone={entry.state === "error" ? "error" : undefined}
        >
          {entry.state === "error"
            ? (entry.message ?? "Failed")
            : entry.message}
        </span>
      </span>
      <span className={styles["row-end"]}>
        {entry.state === "running" ? (
          <span className={styles.pct}>Running…</span>
        ) : (
          <span className={styles.when}>
            {relativeTimeFromMs(entry.endedAt ?? entry.startedAt, "")}
          </span>
        )}
      </span>
    </li>
  );
}

/** Persistent record of background jobs and their failures; the dock pill is the ambient half. */
function ActivityCard() {
  const entries = useActivityEntries();
  if (entries.length === 0) return null;
  return (
    <div className={styles.card}>
      <div className={styles["card-header"]}>
        <span className={styles.meta}>Background tasks</span>
      </div>
      <ul className={styles.list}>
        {entries.map((entry) => (
          <ActivityRow key={entry.id} entry={entry} />
        ))}
      </ul>
    </div>
  );
}

export function SavesSection() {
  const { saving, failed, saved } = useSaveQueue();
  const activityEntries = useActivityEntries();

  /** Failed rows always show in full; the session's finished rows spend whatever budget is left. */
  const visibleFailed = failed.slice(0, MAX_DONE_ROWS);
  const visibleSaved = saved.slice(
    0,
    Math.max(0, MAX_DONE_ROWS - visibleFailed.length),
  );
  const hidden =
    failed.length + saved.length - visibleFailed.length - visibleSaved.length;

  const ordered = [...saving, ...visibleFailed, ...visibleSaved];

  const meta = [
    saving.length > 0 && `${formatNumber(saving.length)} saving`,
    failed.length > 0 && `${formatNumber(failed.length)} failed`,
    saved.length > 0 && `${formatNumber(saved.length)} saved`,
  ]
    .filter(Boolean)
    .join(" / ");

  return (
    <>
      {ordered.length > 0 ? (
        <div className={styles.actions}>
          {failed.length > 0 ? (
            <Button
              variant="secondary"
              size="xs"
              onClick={() =>
                void retryFailedSelection(failed.map((r) => r.save.id))
              }
            >
              Retry Failed
            </Button>
          ) : null}
          {saving.length > 0 ? (
            <Button
              variant="secondary"
              size="xs"
              onClick={() => void window.pond.pipelineCancelAll()}
            >
              Stop All
            </Button>
          ) : null}
          {saved.length > 0 ? (
            <Button variant="secondary" size="xs" onClick={clearAllFinished}>
              Clear Finished
            </Button>
          ) : null}
        </div>
      ) : null}

      {ordered.length === 0 && activityEntries.length === 0 ? (
        <Settings.Empty
          title="Nothing saving right now"
          description="Items you save appear here while they land in your library."
        />
      ) : (
        <>
          {ordered.length > 0 ? (
            <div className={styles.card}>
              {meta ? (
                <div className={styles["card-header"]}>
                  <span className={styles.meta}>{meta}</span>
                </div>
              ) : null}
              <ul className={styles.list}>
                {ordered.map((row) => (
                  <SaveRow key={row.save.id} row={row} />
                ))}
              </ul>
              {hidden > 0 ? (
                <p className={styles["more-line"]}>
                  and {formatNumber(hidden)} more
                </p>
              ) : null}
            </div>
          ) : null}
          <ActivityCard />
        </>
      )}
    </>
  );
}
