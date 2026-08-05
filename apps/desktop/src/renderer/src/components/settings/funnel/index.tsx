import {
  IconCircleXmarkFill18 as ClearFailed,
  IconMediaPauseFill18 as Pause,
} from "@pond/icons/fill/18";
import {
  IconXmarkOutline18 as ClearFinished,
  IconMagnifierOutline18 as Magnifier,
  IconArrowRotateClockwiseOutline18 as Retry,
} from "@pond/icons/outline/18";
import {
  Button,
  DataTable,
  Input,
  Settings,
  type TableColumn,
  Tabs,
  Tooltip,
} from "@pond/ui";
import { useDeferredValue, useMemo, useState } from "react";
import { retryFailedSelection } from "@/lib/save/selection";
import { getSourceLabel } from "@/lib/save/source-labels";
import { openSave as navigateToSave } from "@/lib/ui/save-nav";
import { formatNumber } from "@/lib/util/format";
import { useActivityEntries } from "@/stores/activity";
import { settingsModal } from "@/stores/settings-modal";
import { ActivityCard } from "./activity-card";
import {
  clearAllFailed,
  clearAllFinished,
  humanizeError,
  type QueueRow,
  useSaveQueue,
} from "./lib/queue";
import { StatusCell } from "./status-cell";
import styles from "./styles.module.css";
import { Thumb } from "./thumb";

/** Finished rows beyond this render as a single "and N more" footer note. */
const MAX_DONE_ROWS = 200;

type StatusFilter = "all" | "saving" | "failed" | "saved";

const STATUS_RANK: Record<QueueRow["status"], number> = {
  saving: 0,
  failed: 1,
  saved: 2,
};

const FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "saving", label: "Saving" },
  { value: "failed", label: "Failed" },
  { value: "saved", label: "Saved" },
];

/** Settings closes first so the save page isn't revealed underneath the dialog. */
function openSave(id: string): void {
  settingsModal.close();
  navigateToSave(id);
}

/** Prefer a real title; otherwise the path, so the table isn't a wall of full Instagram URLs. */
function displayName(row: QueueRow): string {
  const title = row.save.title?.trim();
  if (title) return title;
  try {
    const path = new URL(row.save.url).pathname.replace(/\/$/, "");
    return path || row.save.url;
  } catch {
    return row.name;
  }
}

function secondaryMeta(row: QueueRow): string {
  const source = getSourceLabel(row.save.source);
  if (row.status === "failed") return `${source} · ${humanizeError(row.error)}`;
  if (row.status === "saving") return `${source} · ${row.stage ?? "Queued"}`;
  return source;
}

const funnelColumns: TableColumn<QueueRow>[] = [
  {
    id: "name",
    header: "Name",
    accessor: (r) => displayName(r),
    cell: (r) => (
      <span className={styles.name} title={r.save.url}>
        <Thumb save={r.save} active={r.status === "saving"} />
        <span className={styles["name-stack"]}>
          <span className={styles["name-text"]}>{displayName(r)}</span>
          <span className={styles.meta}>{secondaryMeta(r)}</span>
        </span>
      </span>
    ),
    width: "minmax(0, 1fr)",
  },
  {
    id: "status",
    header: "Status",
    accessor: (r) => STATUS_RANK[r.status],
    cell: (r) => <StatusCell row={r} />,
    width: "72px",
  },
  {
    id: "actions",
    header: "",
    headerHidden: true,
    cell: (r) =>
      r.status === "failed" ? (
        <Tooltip label="Retry">
          <Button
            size="sm"
            icon
            variant="secondary"
            aria-label="Retry"
            onClick={(e) => {
              e.stopPropagation();
              void retryFailedSelection([r.save.id]);
            }}
          >
            <Retry />
          </Button>
        </Tooltip>
      ) : null,
    width: "40px",
    align: "end",
  },
];

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
        displayName(row).toLowerCase().includes(needle) ||
        row.save.url.toLowerCase().includes(needle) ||
        getSourceLabel(row.save.source).toLowerCase().includes(needle) ||
        (row.status === "failed" &&
          humanizeError(row.error).toLowerCase().includes(needle))
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
            <Tabs
              size="sm"
              variant="segmented"
              value={status}
              onValueChange={(next) => setStatus(next as StatusFilter)}
              aria-label="Filter by status"
              className={styles.filters}
              tabs={FILTER_OPTIONS}
            />
            <div className={styles.spacer} />
            <div className={styles.actions}>
              {failed.length > 0 ? (
                <>
                  <Tooltip label="Retry Failed">
                    <Button
                      size="sm"
                      icon
                      variant="secondary"
                      aria-label="Retry Failed"
                      onClick={() =>
                        void retryFailedSelection(failed.map((r) => r.save.id))
                      }
                    >
                      <Retry />
                    </Button>
                  </Tooltip>
                  <Tooltip label="Clear Failed">
                    <Button
                      size="sm"
                      icon
                      variant="secondary"
                      aria-label="Clear Failed"
                      onClick={clearAllFailed}
                    >
                      <ClearFailed />
                    </Button>
                  </Tooltip>
                </>
              ) : null}
              {saving.length > 0 ? (
                <Tooltip label="Stop All">
                  <Button
                    size="sm"
                    icon
                    variant="secondary"
                    aria-label="Stop All"
                    onClick={() => void window.pond.pipelineCancelAll()}
                  >
                    <Pause />
                  </Button>
                </Tooltip>
              ) : null}
              {saved.length > 0 ? (
                <Tooltip label="Clear Finished">
                  <Button
                    size="sm"
                    icon
                    variant="secondary"
                    aria-label="Clear Finished"
                    onClick={clearAllFinished}
                  >
                    <ClearFinished />
                  </Button>
                </Tooltip>
              ) : null}
            </div>
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
