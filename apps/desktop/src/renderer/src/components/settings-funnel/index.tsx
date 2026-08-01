import { IconMagnifierOutline18 as Magnifier } from "@pond/icons/outline/18";
import { SOURCES, type Source } from "@pond/schema/db";
import { Button, DataTable, Input, Settings, type TableColumn } from "@pond/ui";
import { useDeferredValue, useMemo, useState } from "react";
import { type EnumOption, EnumSelect } from "@/components/enum-select";
import { pickPrimaryUnit } from "@/lib/media/units";
import { withThumbWidth } from "@/lib/media/url";
import { retryFailedSelection } from "@/lib/save/selection";
import { getSourceDef } from "@/lib/save/sources-registry";
import type { Save } from "@/lib/types";
import { openSave as navigateToSave } from "@/lib/ui/save-nav";
import { formatBytes, formatNumber } from "@/lib/util/format";
import { relativeTimeFromMs } from "@/lib/util/relative-time";
import { type ActivityEntry, useActivityEntries } from "@/stores/activity";
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

type StatusFilter = "all" | "saving" | "failed" | "saved";

const STATUS_OPTIONS: readonly EnumOption<StatusFilter>[] = [
  { value: "all", label: "All statuses" },
  { value: "saving", label: "Saving" },
  { value: "failed", label: "Failed" },
  { value: "saved", label: "Saved" },
];

const STATUS_RANK: Record<QueueRow["status"], number> = {
  saving: 0,
  failed: 1,
  saved: 2,
};

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

function StatusCell({ row }: { row: QueueRow }) {
  if (row.status === "saving") {
    return (
      <span
        className={styles.status}
        data-status="saving"
        title={row.stage ?? "Queued"}
      >
        <span className={styles.dot} aria-hidden />
        {Math.round(row.progress * 100)}%
        <span className={styles.bar} aria-hidden>
          <span
            className={styles["bar-fill"]}
            style={{ transform: `scaleX(${row.progress})` }}
          />
        </span>
      </span>
    );
  }
  if (row.status === "failed") {
    return (
      <span
        className={styles.status}
        data-status="failed"
        title={humanizeError(row.error)}
      >
        <span className={styles.dot} aria-hidden />
        Failed
      </span>
    );
  }
  return (
    <span className={styles.status} data-status="saved">
      <span className={styles.dot} aria-hidden />
      Saved
    </span>
  );
}

/** Settings closes first so the save page isn't revealed underneath the dialog. */
function openSave(id: string): void {
  settingsModal.close();
  navigateToSave(id);
}

const funnelColumns: TableColumn<QueueRow>[] = [
  {
    id: "name",
    header: "Name",
    accessor: (r) => r.name,
    cell: (r) => (
      <span className={styles.name} title={r.save.url}>
        <Thumb save={r.save} />
        <span className={styles["name-text"]}>{r.name}</span>
      </span>
    ),
    width: "minmax(0, 1.8fr)",
  },
  {
    id: "source",
    header: "Source",
    accessor: (r) => sourceLabel(r.save),
    cell: (r) => <span className={styles.meta}>{sourceLabel(r.save)}</span>,
    width: "110px",
  },
  {
    id: "status",
    header: "Status",
    accessor: (r) => STATUS_RANK[r.status],
    cell: (r) => <StatusCell row={r} />,
    width: "140px",
  },
  {
    id: "size",
    header: "Size",
    accessor: (r) => r.size,
    cell: (r) => (
      <span className={styles.meta}>
        {r.size != null ? formatBytes(r.size) : "—"}
      </span>
    ),
    width: "90px",
  },
  {
    id: "when",
    header: "Saved",
    accessor: (r) => r.save.ingestCompletedAt ?? Number.NEGATIVE_INFINITY,
    cell: (r) => (
      <span className={styles.meta}>
        {relativeTimeFromMs(r.save.ingestCompletedAt ?? null, "—")}
      </span>
    ),
    width: "110px",
  },
  {
    id: "actions",
    header: "",
    headerHidden: true,
    cell: (r) =>
      r.status === "failed" ? (
        <Button
          size="sm"
          variant="secondary"
          onClick={(e) => {
            e.stopPropagation();
            void retryFailedSelection([r.save.id]);
          }}
        >
          Retry
        </Button>
      ) : null,
    width: "88px",
    align: "end",
  },
];

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
        <span className={styles["card-title"]}>Background tasks</span>
      </div>
      <ul className={styles.list}>
        {entries.map((entry) => (
          <ActivityRow key={entry.id} entry={entry} />
        ))}
      </ul>
    </div>
  );
}

export function FunnelSection() {
  const { saving, failed, saved } = useSaveQueue();
  const activityEntries = useActivityEntries();

  const [q, setQ] = useState("");
  const deferredQ = useDeferredValue(q);
  const [status, setStatus] = useState<StatusFilter>("all");

  /** Failed rows always show in full; the session's finished rows spend whatever budget is left. */
  const visibleFailed = failed.slice(0, MAX_DONE_ROWS);
  const visibleSaved = saved.slice(
    0,
    Math.max(0, MAX_DONE_ROWS - visibleFailed.length),
  );
  const hidden =
    failed.length + saved.length - visibleFailed.length - visibleSaved.length;

  const needle = deferredQ.trim().toLowerCase();
  const rows = useMemo(() => {
    const ordered = [...saving, ...visibleFailed, ...visibleSaved];
    return ordered.filter((row) => {
      if (status !== "all" && row.status !== status) return false;
      if (!needle) return true;
      return (
        row.name.toLowerCase().includes(needle) ||
        row.save.url.toLowerCase().includes(needle) ||
        sourceLabel(row.save).toLowerCase().includes(needle)
      );
    });
  }, [saving, visibleFailed, visibleSaved, status, needle]);

  const total = saving.length + failed.length + saved.length;

  if (total === 0 && activityEntries.length === 0) {
    return (
      <Settings.Empty
        title="Nothing in the funnel"
        description="Items you save appear here while they land in your library."
      />
    );
  }

  return (
    <div className={styles.content}>
      {total > 0 ? (
        <DataTable.Provider
          data={rows}
          columns={funnelColumns}
          getRowId={(row) => row.save.id}
          defaultSort={{ id: "status", desc: false }}
          onRowClick={(row) => {
            if (row.status !== "saving") openSave(row.save.id);
          }}
        >
          <DataTable.Toolbar className={styles.toolbar}>
            <Input.Root className={styles.search}>
              <Input.Icon>
                <Magnifier width={14} height={14} />
              </Input.Icon>
              <Input.Field
                value={q}
                onChange={(e) => setQ(e.target.value)}
                spellCheck={false}
                placeholder="Search…"
              />
            </Input.Root>
            <EnumSelect<StatusFilter>
              value={status}
              onValueChange={setStatus}
              options={STATUS_OPTIONS}
              aria-label="Filter by status"
            />
            <div className={styles.spacer} />
            {failed.length > 0 ? (
              <Button
                size="sm"
                variant="secondary"
                onClick={() =>
                  void retryFailedSelection(failed.map((r) => r.save.id))
                }
              >
                Retry Failed
              </Button>
            ) : null}
            {saving.length > 0 ? (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => void window.pond.pipelineCancelAll()}
              >
                Stop All
              </Button>
            ) : null}
            {saved.length > 0 ? (
              <Button size="sm" variant="secondary" onClick={clearAllFinished}>
                Clear Finished
              </Button>
            ) : null}
          </DataTable.Toolbar>

          <DataTable.Root>
            <DataTable.Empty>
              <p className={styles["quiet-line"]}>No matches.</p>
            </DataTable.Empty>
          </DataTable.Root>

          {hidden > 0 ? (
            <p className={styles["more-line"]}>
              and {formatNumber(hidden)} more
            </p>
          ) : null}
        </DataTable.Provider>
      ) : null}

      <ActivityCard />
    </div>
  );
}
