import { IconMagnifierOutline18 as Magnifier } from "@pond/icons/outline/18";
import { Button, DataTable, Input, Settings, type TableColumn } from "@pond/ui";
import { useDeferredValue, useMemo, useState } from "react";
import { type EnumOption, EnumSelect } from "@/components/shared/enum-select";
import { retryFailedSelection } from "@/lib/save/selection";
import { getSourceLabel } from "@/lib/save/source-labels";
import { openSave as navigateToSave } from "@/lib/ui/save-nav";
import { formatBytes, formatNumber } from "@/lib/util/format";
import { relativeTimeFromMs } from "@/lib/util/relative-time";
import { useActivityEntries } from "@/stores/activity";
import { settingsModal } from "@/stores/settings-modal";
import { ActivityCard } from "./activity-card";
import { clearAllFinished, type QueueRow, useSaveQueue } from "./lib/queue";
import { StatusCell } from "./status-cell";
import styles from "./styles.module.css";
import { Thumb } from "./thumb";

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
    accessor: (r) => getSourceLabel(r.save.source),
    cell: (r) => (
      <span className={styles.meta}>{getSourceLabel(r.save.source)}</span>
    ),
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
        getSourceLabel(row.save.source).toLowerCase().includes(needle)
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
