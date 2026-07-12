import type { Op } from "@pond/schema/db";
import { Button, Input, Menu } from "@pond/ui";
import { useMemo, useState } from "react";
import { useSaves } from "@/hooks/use-saves";
import { pickPrimaryUnit } from "@/lib/media/units";
import { withThumbWidth } from "@/lib/media/url";
import { retryFailedSelection } from "@/lib/save/selection";
import type { Save } from "@/lib/types";
import { formatBytes, formatNumber } from "@/lib/util/format";
import styles from "./styles.module.css";

// Completed saves only appear on this page if they landed after the app
// started: the page is a control screen for the current session's work, not
// a second library view. Cleared ("Clear finished") ids stay hidden across
// route visits but reset with the window.
const SESSION_START = Date.now();
const clearedIds = new Set<string>();

type RowStatus = "saving" | "saved" | "failed";

interface Row {
  save: Save;
  name: string;
  type: string;
  size: number | null;
  status: RowStatus;
  progress: number;
  stage: string | null;
  error: string | null;
}

const STAGE_LABELS: Record<Op, string> = {
  harvest_metadata: "Reading page",
  capture_tweet: "Capturing tweet",
  fetch_blobs: "Downloading media",
  fetch_video_ytdlp: "Downloading video",
  ensure_poster: "Making poster",
  fetch_avatar: "Fetching avatar",
  finalize: "Finalizing",
};

const STATUS_LABELS: Record<RowStatus, string> = {
  saving: "Saving",
  saved: "Saved",
  failed: "Failed",
};

// Failed first (they need action), then in-flight by progress, then the
// session's completed saves, newest landing on top.
const STATUS_RANK: Record<RowStatus, number> = {
  failed: 0,
  saving: 1,
  saved: 2,
};

type SortKey = "name" | "source" | "type" | "size" | "status";

const MAX_ROWS = 500;

function toRow(save: Save): Row | null {
  let status: RowStatus;
  if (save.status === "ingesting") status = "saving";
  else if (save.status === "failed") status = "failed";
  else if (
    (save.ingestCompletedAt ?? 0) >= SESSION_START &&
    !clearedIds.has(save.id)
  )
    status = "saved";
  else return null;

  const tasks = save.tasks ?? [];
  let done = 0;
  let stage: string | null = null;
  let error: string | null = null;
  for (const t of tasks) {
    if (t.status === "done") done += 1;
    else if (t.status === "running") stage = STAGE_LABELS[t.op];
    else if (t.status === "failed" && !error) {
      error = t.lastError;
      stage ??= STAGE_LABELS[t.op];
    }
  }
  // Nothing running yet (all pending/blocked): show the first unfinished op.
  if (status === "saving" && !stage) {
    const next = tasks.find((t) => t.status !== "done");
    stage = next ? STAGE_LABELS[next.op] : null;
  }

  const size =
    save.fileSize ??
    (save.files.length > 0
      ? save.files.reduce((sum, f) => sum + (f.size || 0), 0)
      : null);

  return {
    save,
    name: save.title?.trim() || save.url,
    type: save.mediaType ?? save.files[0]?.kind ?? "link",
    size,
    status,
    progress:
      status === "saved" ? 1 : tasks.length > 0 ? done / tasks.length : 0,
    stage,
    error,
  };
}

interface Facet {
  key: "status" | "source" | "type";
  label: string;
  valueOf: (row: Row) => string;
  labelOf?: (value: string) => string;
}

const FACETS: Facet[] = [
  {
    key: "status",
    label: "Status",
    valueOf: (r) => r.status,
    labelOf: (v) => STATUS_LABELS[v as RowStatus] ?? v,
  },
  { key: "source", label: "Source", valueOf: (r) => r.save.source },
  { key: "type", label: "Type", valueOf: (r) => r.type },
];

function FacetMenu({
  facet,
  rows,
  active,
  onToggle,
}: {
  facet: Facet;
  rows: Row[];
  active: ReadonlySet<string>;
  onToggle: (value: string) => void;
}) {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const v = facet.valueOf(row);
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  const values =
    facet.key === "status"
      ? (["failed", "saving", "saved"] as const).filter((v) => counts.has(v))
      : [...counts.keys()].sort();

  return (
    <Menu.Root>
      <Menu.Trigger variant="secondary" size="sm" className={styles.facet}>
        {facet.label}
        {active.size > 0 ? (
          <span className={styles["facet-badge"]}>{active.size}</span>
        ) : null}
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner align="start">
          <Menu.Popup>
            {values.length === 0 ? (
              <Menu.Item disabled>
                <Menu.ItemLabel>No values</Menu.ItemLabel>
              </Menu.Item>
            ) : (
              values.map((value) => (
                <Menu.CheckboxItem
                  key={value}
                  checked={active.has(value)}
                  closeOnClick={false}
                  onCheckedChange={() => onToggle(value)}
                >
                  <Menu.CheckboxItemIndicator />
                  <Menu.ItemLabel>
                    {facet.labelOf?.(value) ?? value}
                  </Menu.ItemLabel>
                  <Menu.SecondaryLabel>
                    {formatNumber(counts.get(value) ?? 0)}
                  </Menu.SecondaryLabel>
                </Menu.CheckboxItem>
              ))
            )}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

function Thumb({ save }: { save: Save }) {
  const unit = pickPrimaryUnit(save);
  if (unit && !unit.isVideo) {
    return (
      <img
        className={styles.thumb}
        src={withThumbWidth(unit.url, 56)}
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

function SaveRow({ row }: { row: Row }) {
  const pct = Math.round(row.progress * 100);
  return (
    <div className={styles.tr} data-status={row.status}>
      <Thumb save={row.save} />
      <span className={styles.name} title={row.save.url}>
        {row.name}
      </span>
      <span className={styles.dim}>{row.save.source}</span>
      <span className={styles.dim}>{row.type}</span>
      <span className={styles.size}>{formatBytes(row.size)}</span>
      <span className={styles.dim}>
        {row.status === "saving" ? (row.stage ?? "Queued") : "—"}
      </span>
      <span className={styles["status-cell"]}>
        {row.status === "saving" ? (
          <>
            <span className={styles.bar} aria-hidden>
              <span
                className={styles["bar-fill"]}
                style={{ transform: `scaleX(${row.progress})` }}
              />
            </span>
            <span className={styles["status-word"]}>{pct}%</span>
          </>
        ) : (
          <span
            className={styles["status-word"]}
            title={row.error ?? undefined}
          >
            {STATUS_LABELS[row.status]}
          </span>
        )}
        {row.status === "failed" ? (
          <Button
            variant="secondary"
            size="xs"
            onClick={() => void retryFailedSelection([row.save.id])}
          >
            Retry
          </Button>
        ) : null}
      </span>
    </div>
  );
}

// The Saves control screen: every in-flight and failed save (plus this
// session's completed ones) in one dense table with search, faceted filters,
// sortable columns, and bulk retry/clear. Reached by clicking the saving pill.
export function SavesPage() {
  const saves = useSaves();
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Record<Facet["key"], Set<string>>>({
    status: new Set(),
    source: new Set(),
    type: new Set(),
  });
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 } | null>(null);
  // Bumped when "Clear finished" mutates the module-level cleared set, since
  // that set lives outside React state.
  const [, setClearStamp] = useState(0);

  const rows = useMemo(() => {
    const out: Row[] = [];
    for (const save of saves) {
      if (save.deletedAt != null) continue;
      const row = toRow(save);
      if (row) out.push(row);
    }
    return out;
  }, [saves]);

  const q = query.trim().toLowerCase();
  const filtered = rows.filter(
    (row) =>
      FACETS.every(
        (f) => filters[f.key].size === 0 || filters[f.key].has(f.valueOf(row)),
      ) &&
      (!q ||
        row.name.toLowerCase().includes(q) ||
        row.save.url.toLowerCase().includes(q) ||
        row.save.source.toLowerCase().includes(q)),
  );

  const sorted = [...filtered].sort((a, b) => {
    if (sort) {
      const cmp =
        sort.key === "name"
          ? a.name.localeCompare(b.name)
          : sort.key === "source"
            ? a.save.source.localeCompare(b.save.source)
            : sort.key === "type"
              ? a.type.localeCompare(b.type)
              : sort.key === "size"
                ? (a.size ?? -1) - (b.size ?? -1)
                : a.progress - b.progress;
      if (cmp !== 0) return cmp * sort.dir;
    }
    const rank = STATUS_RANK[a.status] - STATUS_RANK[b.status];
    if (rank !== 0) return rank;
    if (a.status === "saving") return b.progress - a.progress;
    return (b.save.ingestCompletedAt ?? 0) - (a.save.ingestCompletedAt ?? 0);
  });
  const visible = sorted.slice(0, MAX_ROWS);

  const savingCount = rows.filter((r) => r.status === "saving").length;
  const failedCount = rows.filter((r) => r.status === "failed").length;
  const savedCount = rows.length - savingCount - failedCount;

  const toggleFilter = (key: Facet["key"], value: string) => {
    setFilters((prev) => {
      const next = new Set(prev[key]);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return { ...prev, [key]: next };
    });
  };

  const toggleSort = (key: SortKey) => {
    setSort((prev) =>
      prev?.key === key
        ? prev.dir === 1
          ? { key, dir: -1 }
          : null
        : { key, dir: 1 },
    );
  };

  const clearFinished = () => {
    for (const row of rows) {
      if (row.status === "saved") clearedIds.add(row.save.id);
    }
    setClearStamp((n) => n + 1);
  };

  const subline =
    rows.length === 0
      ? "Nothing saving right now"
      : [
          savingCount > 0 &&
            `Saving ${formatNumber(savingCount)} ${savingCount === 1 ? "item" : "items"}`,
          savedCount > 0 && `${formatNumber(savedCount)} saved this session`,
          failedCount > 0 && `${formatNumber(failedCount)} failed`,
        ]
          .filter(Boolean)
          .join(" · ") || "All caught up";

  const headers: Array<{ key: SortKey | null; label: string }> = [
    { key: "name", label: "Name" },
    { key: "source", label: "Source" },
    { key: "type", label: "Type" },
    { key: "size", label: "Size" },
    { key: null, label: "Stage" },
    { key: "status", label: "Status" },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <header className={styles.header}>
          <h1 className={styles.title}>Saves</h1>
          <p className={styles.subline}>{subline}</p>
        </header>

        <div className={styles.toolbar}>
          <Input.Root className={styles.search}>
            <Input.Field
              type="search"
              placeholder="Filter saves…"
              value={query}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setQuery(e.target.value)
              }
            />
          </Input.Root>
          {FACETS.map((facet) => (
            <FacetMenu
              key={facet.key}
              facet={facet}
              rows={rows}
              active={filters[facet.key]}
              onToggle={(value) => toggleFilter(facet.key, value)}
            />
          ))}
          <div className={styles.bulk}>
            <Button
              variant="destructive"
              size="sm"
              disabled={failedCount === 0}
              onClick={() =>
                void retryFailedSelection(
                  rows
                    .filter((r) => r.status === "failed")
                    .map((r) => r.save.id),
                )
              }
            >
              Retry failed
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={savedCount === 0}
              onClick={clearFinished}
            >
              Clear finished
            </Button>
          </div>
        </div>

        {rows.length === 0 ? (
          <div className={styles.empty}>
            <p className={styles["empty-title"]}>Nothing saving right now</p>
            <p className={styles["empty-sub"]}>
              Items you save from the extension appear here while they land in
              your library.
            </p>
          </div>
        ) : (
          <div className={styles.table}>
            <div className={styles.thead}>
              <span />
              {headers.map(({ key, label }) =>
                key ? (
                  <button
                    key={label}
                    type="button"
                    className={styles.th}
                    data-dir={sort?.key === key ? sort.dir : undefined}
                    onClick={() => toggleSort(key)}
                  >
                    {label}
                    <span className={styles.arrow} aria-hidden>
                      {sort?.key === key && sort.dir === -1 ? "▼" : "▲"}
                    </span>
                  </button>
                ) : (
                  <span key={label} className={styles.th}>
                    {label}
                  </span>
                ),
              )}
            </div>
            {visible.map((row) => (
              <SaveRow key={row.save.id} row={row} />
            ))}
            <div className={styles.tfoot}>
              {formatNumber(visible.length)}
              {sorted.length > visible.length
                ? ` of ${formatNumber(sorted.length)}`
                : ""}{" "}
              {visible.length === 1 ? "row" : "rows"}
              {sorted.length !== rows.length
                ? ` (filtered from ${formatNumber(rows.length)})`
                : ""}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
