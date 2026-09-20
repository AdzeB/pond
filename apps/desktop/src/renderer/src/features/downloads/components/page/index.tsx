import {
  IconArrowRotateClockwiseFill18,
  IconMediaPauseFill18,
  IconMediaPlayFill18,
} from "@pond/icons/fill/18";
import {
  IconBanOutline18,
  IconCircleCheckOutline18,
  IconLink2Outline18,
  IconTrashXmarkOutline18,
  IconXmarkOutline18,
} from "@pond/icons/outline/18";
import { sourceLabel } from "@pond/schema/sources";
import { Button, Dialog, Tooltip } from "@pond/ui";
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
  downloadFiltersActive,
  downloadRowSource,
  type HistoryCursor,
  HistoryPageSchema,
  historyToDownloadRow,
  matchesDownloadFilters,
  PipelineStatusSchema,
  projectLiveDownloads,
  STATUS_FILTER_OPTIONS,
  statusFeed,
} from "@/features/downloads/lib/status-feed";
import {
  downloadsFilters,
  useDownloadsFilters,
} from "@/features/downloads/state/downloads-filters";
import {
  downloadsSelection,
  useDownloadsSelectionRows,
} from "@/features/downloads/state/downloads-selection";
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
import {
  useDownloadActivity,
  useDownloadClock,
} from "../../hooks/use-download-activity";
import {
  canSkipDownload,
  canTrashDownload,
  confirmSkipDownloadRows,
  confirmTrashDownloadRows,
  retryDownloadRows,
} from "../lib/actions";
import { TransferJobsPanel } from "../transfers";
import { DownloadsView } from "./downloads-view";

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
        if (!stopped) await reloadSaves(ids);
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
  const now = useDownloadClock();
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
        if (seen.has(row.saveId)) return [];
        seen.add(row.saveId);
        return [historyToDownloadRow(row)];
      });
  }, [history.data, live]);
  const rows = useMemo(
    () => live.filter((row) => matchesDownloadFilters(row, filters)),
    [live, filters],
  );
  const visibleCompleted = useMemo(
    () => completed.filter((row) => matchesDownloadFilters(row, filters)),
    [completed, filters],
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
  useEffect(() => () => downloadsSelection.clear(), []);

  const pipeline = useQuery({
    queryKey: ["pipeline.status"],
    queryFn: async () =>
      PipelineStatusSchema.parse(
        await window.pond.query("pipeline.status", {}),
      ),
  });
  const paused = pipeline.data?.paused === true;
  const tableFiltersActive = downloadFiltersActive(filters);
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
  const selected = useDownloadsSelectionRows();
  const skippable = selected.filter(canSkipDownload);
  const trashable = selected.filter(canTrashDownload);
  const failedRows = rows.filter((row) => row.status === "failed");
  const retry = useMutation({
    mutationFn: () => retryDownloadRows(failedRows),
    onError: () =>
      statusFeed.error(
        "Retry downloads",
        "Couldn't retry these downloads. Try again.",
      ),
  });
  const cancelAll = () => {
    Dialog.confirm({
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
            <Tooltip label="Retry Failed" side="bottom">
              <Button
                icon
                size="sm"
                variant="ghost"
                aria-label="Retry Failed"
                disabled={failedRows.length === 0 || retry.isPending}
                loading={retry.isPending}
                onClick={() => retry.mutate()}
              >
                <IconArrowRotateClockwiseFill18 />
              </Button>
            </Tooltip>
            <Tooltip label="Skip Selected" side="bottom">
              <Button
                icon
                size="sm"
                variant="ghost"
                aria-label="Skip Selected"
                disabled={skippable.length === 0}
                onClick={() => confirmSkipDownloadRows(skippable)}
              >
                <IconBanOutline18 />
              </Button>
            </Tooltip>
            <Tooltip label="Move to Trash" side="bottom">
              <Button
                icon
                size="sm"
                variant="ghost"
                aria-label="Move to Trash"
                disabled={trashable.length === 0}
                onClick={() => confirmTrashDownloadRows(trashable)}
              >
                <IconTrashXmarkOutline18 />
              </Button>
            </Tooltip>
            <Tooltip label="Cancel All" side="bottom">
              <Button
                icon
                size="sm"
                variant="ghost"
                aria-label="Cancel All"
                disabled={!live.some((row) => row.status !== "failed")}
                onClick={cancelAll}
              >
                <IconXmarkOutline18 />
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
        now={now}
        inspectedId={
          rightPane === "inspector" && inspectorMode === "download"
            ? inspectorId
            : null
        }
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
