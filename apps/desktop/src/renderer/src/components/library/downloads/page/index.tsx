import { IconMediaPauseFill18, IconMediaPlayFill18 } from "@pond/icons/fill/18";
import {
  IconBarsFilterOutline18,
  IconDotsOutline18,
  IconRefreshOutline18,
} from "@pond/icons/outline/18";
import type { Op, Source } from "@pond/schema/db";
import {
  Button,
  DataTable,
  Menu,
  type MenuItemSpec,
  type RenderRowArgs,
  Tooltip,
} from "@pond/ui";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { DownloadsEmpty, MatchesEmpty } from "@/components/library/empty";
import { FilterSelect } from "@/components/library/filter-menu/select";
import {
  SearchChrome,
  SearchChromeInput,
} from "@/components/library/search-chrome";
import { TableSelectionSync } from "@/components/library/table-selection-sync";
import { confirm } from "@/components/shared/confirm-dialog";
import { useClientHeight } from "@/hooks/use-client-height";
import { useSaves } from "@/hooks/use-saves";
import { refreshSaves } from "@/lib/save/ensure-saves";
import {
  type DownloadFilters,
  type DownloadRow,
  defaultDownloadFilters,
  type HistoryCursor,
  HistoryPageSchema,
  historyToDownloadRow,
  matchesDownloadFilters,
  mergeDownloadRows,
  PipelineStatusSchema,
  projectLiveDownloads,
  type StatusFilter,
  statusFeed,
} from "@/lib/status-feed";
import { openSave } from "@/lib/ui/save-nav";
import { toggleInSet } from "@/lib/util/set";
import { hydrateFullPool } from "@/stores/bootstrap";
import { downloadsSelection } from "@/stores/downloads-selection";
import { retryDownloadRows } from "../lib/actions";
import { SOURCE_OPTIONS, STAGE_OPTIONS } from "../lib/filters";
import { DownloadQueueRow, downloadsColumns } from "./columns";
import styles from "./styles.module.css";

const INITIAL_CURSOR: HistoryCursor = null;
type PipelineStatus = z.infer<typeof PipelineStatusSchema>;

const STATUS_VIEWS = {
  current: ["in-progress", "failed"],
  attention: ["failed"],
  saved: ["complete"],
  all: [],
} satisfies Record<string, StatusFilter[]>;

const STATUS_ITEMS = [
  { value: "current", label: "Current" },
  { value: "attention", label: "Attention" },
  { value: "saved", label: "Saved" },
  { value: "all", label: "All Downloads" },
] satisfies { value: keyof typeof STATUS_VIEWS; label: string }[];

function FilterMenu({
  label,
  items,
}: {
  label: string;
  items: MenuItemSpec[];
}) {
  return (
    <Menu.Root>
      <Menu.Trigger variant="secondary" size="sm">
        {label}
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner align="start" side="bottom">
          <Menu.Popup className={styles.filterMenu}>
            <Menu.Items items={items} />
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

const InflightIdsSchema = z.array(z.string()).catch([]);

export function DownloadsPage() {
  const saves = useSaves();
  const qc = useQueryClient();
  /** Saves in flight are the oldest by savedAt, so paged loading never reaches them. */
  useEffect(() => {
    void hydrateFullPool().catch((err) => {
      console.warn("[pond pool] full hydrate for downloads failed", err);
    });
  }, []);

  /** A task moving to running writes no sync action, so the rows in flight are re-read on a timer. */
  useEffect(() => {
    let stopped = false;
    const tick = async () => {
      try {
        const ids = InflightIdsSchema.parse(
          await window.pond.query("pipeline.inflight", {}),
        );
        if (!stopped) await refreshSaves(ids);
      } catch (err) {
        console.warn("[pond downloads] inflight refresh failed", err);
      }
    };
    void tick();
    const timer = setInterval(tick, 2_000);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, []);
  const [filters, setFilters] = useState<DownloadFilters>(
    defaultDownloadFilters,
  );
  const [filtersOpen, setFiltersOpen] = useState(false);
  const { ref: tableRef, height: tableHeight } = useClientHeight();
  const showHistory =
    filters.statuses.size === 0 || filters.statuses.has("complete");
  const view =
    filters.statuses.size === 0
      ? "all"
      : filters.statuses.has("complete")
        ? "saved"
        : filters.statuses.has("in-progress")
          ? "current"
          : "attention";
  const hasFilters =
    view !== "current" || filters.sources.size > 0 || filters.ops.size > 0;

  const live = useMemo(() => projectLiveDownloads(saves), [saves]);
  const liveIds = useMemo(() => new Set(live.map((row) => row.saveId)), [live]);
  const prevLiveIds = useRef(liveIds);

  const historyQuery = useInfiniteQuery({
    queryKey: [
      "downloads.history",
      filters.q,
      [...filters.sources].sort(),
      [...filters.ops].sort(),
    ],
    enabled: showHistory,
    queryFn: async ({ pageParam }) =>
      HistoryPageSchema.parse(
        await window.pond.query("downloads.history", {
          cursor: pageParam,
          limit: 50,
          q: filters.q.trim() || undefined,
          sources: filters.sources.size > 0 ? [...filters.sources] : undefined,
          ops: filters.ops.size > 0 ? [...filters.ops] : undefined,
        }),
      ),
    initialPageParam: INITIAL_CURSOR,
    getNextPageParam: (last) => last.nextCursor,
  });

  useEffect(() => {
    const prev = prevLiveIds.current;
    prevLiveIds.current = liveIds;
    if (!showHistory) return;
    for (const id of prev) {
      if (!liveIds.has(id)) {
        void qc.invalidateQueries({ queryKey: ["downloads.history"] });
        break;
      }
    }
  }, [liveIds, showHistory, qc]);

  const history = useMemo(() => {
    if (!showHistory) return [];
    return (historyQuery.data?.pages ?? []).flatMap((page) =>
      page.rows.map(historyToDownloadRow),
    );
  }, [showHistory, historyQuery.data]);

  const rows = useMemo(
    () =>
      mergeDownloadRows(live, history).filter((row) =>
        matchesDownloadFilters(row, filters),
      ),
    [live, history, filters],
  );

  const rowsById = useMemo(() => {
    const map = new Map<string, DownloadRow>();
    for (const row of rows) map.set(row.id, row);
    return map;
  }, [rows]);

  const pipeline = useQuery({
    queryKey: ["pipeline.status"],
    queryFn: async () =>
      PipelineStatusSchema.parse(
        await window.pond.query("pipeline.status", {}),
      ),
  });
  const paused = pipeline.data?.paused === true;
  const hasDefault = !hasFilters && filters.q.trim() === "";
  const emptyLibrary = live.length === 0 && !showHistory;
  const historyPending = showHistory && historyQuery.isPending;
  const historyError = showHistory && historyQuery.isError;
  const showPlaceEmpty = emptyLibrary && hasDefault && rows.length === 0;
  const showMatchesEmpty =
    rows.length === 0 &&
    !showPlaceEmpty &&
    !historyPending &&
    !historyError &&
    !(showHistory && historyQuery.hasNextPage);

  const setView = (next: keyof typeof STATUS_VIEWS) => {
    setFilters((cur) => ({
      ...cur,
      statuses: new Set<StatusFilter>(STATUS_VIEWS[next]),
    }));
  };
  const setSource = (id: Source, on: boolean) => {
    setFilters((cur) => ({
      ...cur,
      sources: toggleInSet(cur.sources, id, on),
    }));
  };
  const setOp = (id: Op, on: boolean) => {
    setFilters((cur) => ({
      ...cur,
      ops: toggleInSet(cur.ops, id, on),
    }));
  };
  const resetDownloadFilters = useCallback(() => {
    setFilters(defaultDownloadFilters());
  }, []);

  const sourceItems: MenuItemSpec[] = SOURCE_OPTIONS.map((opt) => ({
    type: "checkbox",
    label: opt.label,
    checked: filters.sources.has(opt.id),
    closeOnClick: false,
    onCheckedChange: (on) => setSource(opt.id, on),
  }));
  const stageItems: MenuItemSpec[] = STAGE_OPTIONS.map((opt) => ({
    type: "checkbox",
    label: opt.label,
    checked: filters.ops.has(opt.id),
    closeOnClick: false,
    onCheckedChange: (on) => setOp(opt.id, on),
  }));

  const onRowClick = useCallback((row: DownloadRow) => {
    openSave(row.saveId);
  }, []);

  const pause = useMutation({
    mutationFn: () => window.pond.pipelinePause(!paused),
    onSuccess: (result) =>
      qc.setQueryData<PipelineStatus>(["pipeline.status"], {
        paused: result.paused,
      }),
    onError: () =>
      statusFeed.error(
        "Pause downloads",
        "Couldn't change the queue. Try again.",
      ),
  });
  const failedRows = rows.filter((row) => row.status === "failed");
  const retry = useMutation({
    mutationFn: () => retryDownloadRows(failedRows),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["downloads.history"] }),
    onError: () =>
      statusFeed.error(
        "Retry downloads",
        "Couldn't retry these downloads. Try again.",
      ),
  });
  const renderRow = useCallback(
    (args: RenderRowArgs<DownloadRow>) => (
      <DownloadQueueRow {...args} paused={paused} />
    ),
    [paused],
  );

  const cancelAll = () => {
    confirm({
      title: "Cancel All",
      description:
        "Pond stops every current download. You can retry them later.",
      confirmLabel: "Cancel All",
      confirmVariant: "destructive",
      onConfirm: async () => {
        try {
          await window.pond.pipelineCancelAll();
        } catch {
          statusFeed.error(
            "Cancel downloads",
            "Couldn't cancel these downloads. Try again.",
          );
        }
      },
    });
  };

  return (
    <DataTable.Provider
      data={rows}
      columns={downloadsColumns}
      getRowId={(row) => row.id}
      onSelectionChange={(ids) => {
        downloadsSelection.set(
          ids
            .map((id) => rowsById.get(id))
            .filter((row): row is DownloadRow => row != null),
        );
      }}
      height={rows.length === 0 || tableHeight < 80 ? undefined : tableHeight}
      rowHeight={80}
      onRowClick={onRowClick}
      renderRow={renderRow}
    >
      <div className={styles.page}>
        <SearchChrome
          actions={
            <>
              <Tooltip
                label={filtersOpen ? "Hide Filters" : "Show Filters"}
                side="bottom"
              >
                <Button
                  icon
                  size="sm"
                  variant="ghost"
                  className={styles.filterTrigger}
                  aria-label={
                    hasFilters
                      ? "Filter Downloads (Active)"
                      : "Filter Downloads"
                  }
                  aria-expanded={filtersOpen}
                  aria-controls="downloads-filters"
                  data-active={filtersOpen || hasFilters || undefined}
                  onClick={() => setFiltersOpen((open) => !open)}
                >
                  <IconBarsFilterOutline18 />
                  {hasFilters ? <span className={styles.filterDot} /> : null}
                </Button>
              </Tooltip>
              <Tooltip label="Retry Failed" side="bottom">
                <Button
                  icon
                  size="sm"
                  variant="ghost"
                  aria-label="Retry Failed"
                  disabled={failedRows.length === 0 || retry.isPending}
                  onClick={() => retry.mutate()}
                >
                  <IconRefreshOutline18 />
                </Button>
              </Tooltip>
              <Tooltip
                label={
                  paused
                    ? "Resume Queue"
                    : "Pause Queue. Running downloads will finish."
                }
                side="bottom"
              >
                <Button
                  icon
                  size="sm"
                  variant="ghost"
                  aria-label={paused ? "Resume Queue" : "Pause Queue"}
                  disabled={!pipeline.data || pause.isPending}
                  aria-pressed={paused}
                  onClick={() => pause.mutate()}
                >
                  {paused ? <IconMediaPlayFill18 /> : <IconMediaPauseFill18 />}
                </Button>
              </Tooltip>
              <Menu.Root>
                <Tooltip label="More Actions" side="bottom">
                  <Menu.Trigger
                    icon
                    size="sm"
                    variant="ghost"
                    aria-label="More Download Actions"
                  >
                    <IconDotsOutline18 />
                  </Menu.Trigger>
                </Tooltip>
                <Menu.Portal>
                  <Menu.Positioner align="end" side="bottom">
                    <Menu.Popup>
                      <Menu.Items
                        items={[
                          {
                            label: "Cancel All",
                            disabled: !live.some(
                              (row) => row.status !== "failed",
                            ),
                            onClick: cancelAll,
                          },
                        ]}
                      />
                    </Menu.Popup>
                  </Menu.Positioner>
                </Menu.Portal>
              </Menu.Root>
            </>
          }
          below={
            <fieldset
              id="downloads-filters"
              className={styles.filters}
              aria-label="Download Filters"
              hidden={!filtersOpen}
            >
              <FilterSelect
                label="Download Status"
                value={view}
                items={STATUS_ITEMS}
                onChange={setView}
              />
              <FilterMenu
                label={
                  filters.sources.size
                    ? `Sources (${filters.sources.size})`
                    : "All Sources"
                }
                items={sourceItems}
              />
              <FilterMenu
                label={
                  filters.ops.size
                    ? `Stages (${filters.ops.size})`
                    : "All Stages"
                }
                items={stageItems}
              />
              {hasFilters ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    setFilters((cur) => ({
                      ...defaultDownloadFilters(),
                      q: cur.q,
                    }))
                  }
                >
                  Clear Filters
                </Button>
              ) : null}
            </fieldset>
          }
        >
          <SearchChromeInput
            value={filters.q}
            onChange={(e) =>
              setFilters((cur) => ({ ...cur, q: e.target.value }))
            }
            spellCheck={false}
            placeholder="Search downloads…"
            aria-label="Search Downloads"
            data-downloads-search=""
          />
        </SearchChrome>

        {showPlaceEmpty ? (
          <div className={styles.empty}>
            <DownloadsEmpty />
          </div>
        ) : showMatchesEmpty ? (
          <div className={styles.empty}>
            <MatchesEmpty onReset={resetDownloadFilters} />
          </div>
        ) : rows.length === 0 && historyError ? (
          <div className={styles.message} role="alert">
            Couldn't load download history.
            <Button
              size="sm"
              variant="secondary"
              disabled={historyQuery.isFetching}
              onClick={() => void historyQuery.refetch()}
            >
              Try Again
            </Button>
          </div>
        ) : rows.length === 0 && historyPending ? (
          <div className={styles.message} role="status">
            Loading download history
          </div>
        ) : (
          <div ref={tableRef} className={styles.table}>
            <DataTable.Root variant="list">
              <DataTable.Empty>
                {historyPending ? null : (
                  <MatchesEmpty onReset={resetDownloadFilters} />
                )}
              </DataTable.Empty>
              {showHistory && (historyQuery.hasNextPage || historyError) ? (
                <DataTable.ExtraRow>
                  <div className={styles.more}>
                    {historyError ? (
                      <span role="alert">Couldn't load more history.</span>
                    ) : null}
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={historyQuery.isFetchingNextPage}
                      onClick={() =>
                        void (historyQuery.isFetchNextPageError || !historyError
                          ? historyQuery.fetchNextPage()
                          : historyQuery.refetch())
                      }
                    >
                      {historyError
                        ? "Try Again"
                        : historyQuery.isFetchingNextPage
                          ? "Loading"
                          : "Load More"}
                    </Button>
                  </div>
                </DataTable.ExtraRow>
              ) : null}
            </DataTable.Root>
          </div>
        )}
      </div>
      <TableSelectionSync selection={downloadsSelection} rowsById={rowsById} />
    </DataTable.Provider>
  );
}
