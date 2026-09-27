import { IconMediaPauseFill18, IconMediaPlayFill18 } from "@pond/icons/fill/18";
import {
  IconCircleCheckOutline18,
  IconLink2Outline18,
} from "@pond/icons/outline/18";
import { sourceLabel } from "@pond/schema/sources";
import { Button, Tooltip } from "@pond/ui";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { z } from "zod";
import {
  type DownloadRow,
  downloadRowSource,
  type HistoryCursor,
  HistoryPageSchema,
  historyToDownloadRow,
  matchesDownloadFilters,
  PipelineStatusSchema,
  projectLiveDownloads,
  STATUS_FILTER_OPTIONS,
  type StatusFilter,
  statusFeed,
} from "@/features/downloads/lib/status-feed";
import {
  downloadsFilters,
  useDownloadsFilters,
} from "@/features/downloads/state/downloads-filters";
import { downloadsSelection } from "@/features/downloads/state/downloads-selection";
import {
  DownloadsEmpty,
  MatchesEmpty,
} from "@/features/library/components/empty";
import {
  libraryChrome,
  useInspectorMode,
  useInspectorSaveId,
  useRightPane,
} from "@/features/library/state/library-chrome";
import { useSaves } from "@/features/saves/hooks/use-saves";
import { reloadSaves } from "@/features/saves/lib/ensure-saves";
import {
  SearchChrome,
  SearchChromeInput,
} from "@/shared/components/search-chrome";
import {
  TableFilterBar,
  TableFilterChip,
  TableFilterToggle,
} from "@/shared/components/table-filters";
import { uniqueFilterOptions } from "@/shared/components/table-filters/chip-label";
import { useDownloadActivity } from "../../hooks/use-download-activity";
import { TransferJobsPanel } from "../transfers";
import { DownloadsView } from "./downloads-view";
import { hydrateLiveDownloadSaves } from "./hydrate-live-saves";

import styles from "./styles.module.css";

const InflightIdsSchema = z.array(z.string()).catch([]);
const initialHistoryCursor: HistoryCursor = null;
type PipelineStatus = z.infer<typeof PipelineStatusSchema>;

function DownloadsMatchesEmpty({ onReset }: { onReset: () => void }) {
  return <MatchesEmpty onReset={onReset} />;
}

export function DownloadsPage() {
  const saves = useSaves();
  const qc = useQueryClient();
  useEffect(() => {
    let stopped = false;
    const hydrate = async (
      name: "downloads.ingestingOrFailed" | "pipeline.inflight",
    ) => {
      try {
        const ids = InflightIdsSchema.parse(await window.pond.query(name, {}));
        if (stopped) return;
        if (name === "downloads.ingestingOrFailed") {
          await hydrateLiveDownloadSaves(ids, () => stopped);
          return;
        }
        await reloadSaves(ids);
      } catch (err) {
        console.warn(`[pond downloads] ${name} refresh failed`, err);
      }
    };
    void hydrate("downloads.ingestingOrFailed");
    void hydrate("pipeline.inflight");
    const timer = setInterval(() => void hydrate("pipeline.inflight"), 2_000);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, []);
  const filters = useDownloadsFilters();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const activity = useDownloadActivity();
  const inspectorId = useInspectorSaveId();
  const inspectorMode = useInspectorMode();
  const rightPane = useRightPane();
  const live = useMemo(() => projectLiveDownloads(saves), [saves]);
  const history = useInfiniteQuery({
    queryKey: ["downloads.history", filters.q],
    initialPageParam: initialHistoryCursor,
    queryFn: async ({ pageParam }) =>
      HistoryPageSchema.parse(
        await window.pond.query("downloads.history", {
          limit: 50,
          cursor: pageParam,
          q: filters.q,
        }),
      ),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    refetchInterval: 5_000,
  });
  const completed = useMemo(() => {
    const seen = new Set(live.map((row) => row.saveId));
    return (history.data?.pages ?? [])
      .flatMap((page) => page.rows)
      .flatMap((row) => {
        if (row.source === "local") return [];
        if (seen.has(row.saveId)) return [];
        seen.add(row.saveId);
        return [historyToDownloadRow(row)];
      });
  }, [history.data, live]);
  const statuslessFilters = useMemo(
    () => ({ ...filters, statuses: new Set<StatusFilter>() }),
    [filters],
  );
  const scopedLive = useMemo(
    () => live.filter((row) => matchesDownloadFilters(row, statuslessFilters)),
    [live, statuslessFilters],
  );
  const scopedCompleted = useMemo(
    () =>
      completed.filter((row) => matchesDownloadFilters(row, statuslessFilters)),
    [completed, statuslessFilters],
  );
  const rows = useMemo(
    () => scopedLive.filter((row) => matchesDownloadFilters(row, filters)),
    [scopedLive, filters],
  );
  const visibleCompleted = useMemo(
    () => scopedCompleted.filter((row) => matchesDownloadFilters(row, filters)),
    [scopedCompleted, filters],
  );
  const sourceOptions = useMemo(
    () =>
      uniqueFilterOptions(
        [...live, ...completed].map((row) => {
          const id = downloadRowSource(row);
          return { id, label: sourceLabel(id) };
        }),
      ),
    [live, completed],
  );
  useEffect(() => {
    const available = new Map(
      [...rows, ...visibleCompleted].map((row) => [row.id, row]),
    );
    downloadsSelection.set(
      downloadsSelection.snapshot().flatMap((row) => {
        const current = available.get(row.id);
        return current ? [current] : [];
      }),
    );
  }, [rows, visibleCompleted]);
  useEffect(() => {
    if (rightPane !== "inspector") return;
    const visible = [...rows, ...visibleCompleted];
    const inspectedVisible =
      inspectorMode === "download" &&
      inspectorId != null &&
      visible.some((row) => row.saveId === inspectorId);
    if (inspectedVisible) return;
    const first = visible[0];
    if (first) libraryChrome.inspectDownload(first.saveId);
  }, [rows, visibleCompleted, rightPane, inspectorMode, inspectorId]);
  useEffect(() => () => downloadsSelection.clear(), []);

  const pipeline = useQuery({
    queryKey: ["pipeline.status"],
    queryFn: async () =>
      PipelineStatusSchema.parse(
        await window.pond.query("pipeline.status", {}),
      ),
  });
  const paused = pipeline.data?.paused === true;
  const tableFiltersActive =
    filters.sources.size > 0 || filters.statuses.size > 0;
  const filtering = filters.q.trim() !== "" || tableFiltersActive;
  const showPlaceEmpty =
    live.length === 0 && completed.length === 0 && !filtering;
  const showMatchesEmpty =
    rows.length === 0 &&
    visibleCompleted.length === 0 &&
    !history.isPending &&
    !showPlaceEmpty;

  const onRowClick = useCallback((row: DownloadRow) => {
    libraryChrome.inspectDownload(row.saveId);
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
  return (
    <div className={styles.page}>
      <SearchChrome
        actions={
          <>
            <TableFilterToggle
              open={filtersOpen}
              active={tableFiltersActive}
              controlsId="downloads-filter-toolbar"
              onToggle={() => setFiltersOpen((open) => !open)}
            />
            <Tooltip
              label={
                paused
                  ? "Resume background downloads"
                  : "Pause background downloads. Links you add still start."
              }
              side="bottom"
            >
              <Button
                icon
                size="sm"
                variant="ghost"
                disabled={!pipeline.data || pause.isPending}
                loading={pause.isPending}
                onClick={() => pause.mutate()}
                aria-label={paused ? "Resume Queue" : "Pause Queue"}
              >
                {paused ? <IconMediaPlayFill18 /> : <IconMediaPauseFill18 />}
              </Button>
            </Tooltip>
          </>
        }
        below={
          <TableFilterBar
            open={filtersOpen}
            id="downloads-filter-toolbar"
            label="Download Filters"
          >
            <TableFilterChip
              name="Status"
              icon={<IconCircleCheckOutline18 />}
              options={STATUS_FILTER_OPTIONS}
              selected={filters.statuses}
              onChange={downloadsFilters.setStatuses}
            />
            <TableFilterChip
              name="Source"
              icon={<IconLink2Outline18 />}
              options={sourceOptions}
              selected={filters.sources}
              onChange={downloadsFilters.setSources}
            />
          </TableFilterBar>
        }
      >
        <SearchChromeInput
          value={filters.q}
          onChange={(e) => downloadsFilters.setQ(e.target.value)}
          spellCheck={false}
          placeholder="Search downloads…"
          aria-label="Search Downloads"
          data-downloads-search=""
        />
      </SearchChrome>

      {activity.isError ? (
        <p className={styles.activityError} role="status">
          Live activity is unavailable.{" "}
          <Button
            type="button"
            size="xs"
            variant="text"
            onClick={() => void activity.refetch()}
          >
            Try Again
          </Button>
        </p>
      ) : null}
      <TransferJobsPanel search={filters.q} />
      <DownloadsView
        rows={rows}
        completed={visibleCompleted}
        activities={activity.data ?? []}
        paused={paused}
        onInspect={onRowClick}
        historyLoading={history.isPending}
        historyError={history.isError}
        hasMore={history.hasNextPage}
        loadingMore={history.isFetchingNextPage}
        onLoadMore={() => void history.fetchNextPage()}
        onRetryHistory={() => void history.refetch()}
        empty={
          showPlaceEmpty ? (
            <div className={styles.empty}>
              <DownloadsEmpty />
            </div>
          ) : showMatchesEmpty ? (
            <div className={styles.empty}>
              <DownloadsMatchesEmpty onReset={downloadsFilters.reset} />
            </div>
          ) : null
        }
      />
    </div>
  );
}
