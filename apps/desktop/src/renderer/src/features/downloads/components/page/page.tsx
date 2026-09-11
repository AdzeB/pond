import {
  IconArrowRotateClockwiseFill18,
  IconMediaPauseFill18,
  IconMediaPlayFill18,
} from "@pond/icons/fill/18";
import { IconXmarkOutline18 } from "@pond/icons/outline/18";
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
  type HistoryCursor,
  HistoryPageSchema,
  historyToDownloadRow,
  PipelineStatusSchema,
  projectLiveDownloads,
  statusFeed,
} from "@/features/downloads/lib/status-feed";
import { downloadsSelection } from "@/features/downloads/state/downloads-selection";
import {
  DownloadsEmpty,
  MatchesEmpty,
} from "@/features/library/components/empty/empty";
import {
  libraryChrome,
  useInspectorMode,
  useInspectorSaveId,
  useRightPane,
} from "@/features/library/state/library-chrome";
import { useSaves } from "@/features/saves/hooks/use-saves";
import { refreshSaves } from "@/features/saves/lib/ensure-saves";
import {
  SearchChrome,
  SearchChromeInput,
} from "@/shared/components/search-chrome/search-chrome";
import {
  useDownloadActivity,
  useDownloadClock,
} from "../../hooks/use-download-activity";
import { retryDownloadRows } from "../lib/actions";
import { TransferJobsPanel } from "../transfers/transfer-jobs";
import { DownloadsView } from "./downloads-view";

import styles from "./page.module.css";

const InflightIdsSchema = z.array(z.string()).catch([]);
const initialHistoryCursor: HistoryCursor = null;
type PipelineStatus = z.infer<typeof PipelineStatusSchema>;

function DownloadsMatchesEmpty({ onReset }: { onReset: () => void }) {
  return (
    <MatchesEmpty
      actionLabel="Clear Search"
      description="Try a different title or source."
      onReset={onReset}
    />
  );
}

export function DownloadsPage() {
  const saves = useSaves();
  const qc = useQueryClient();
  /** Live rows can be older than the paged pool; running tasks also skip sync actions. */
  useEffect(() => {
    let stopped = false;
    const hydrate = async (name: "downloads.live" | "pipeline.inflight") => {
      try {
        const ids = InflightIdsSchema.parse(await window.pond.query(name, {}));
        if (!stopped) await refreshSaves(ids);
      } catch (err) {
        console.warn(`[pond downloads] ${name} refresh failed`, err);
      }
    };
    void hydrate("downloads.live");
    void hydrate("pipeline.inflight");
    const timer = setInterval(() => void hydrate("pipeline.inflight"), 2_000);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, []);
  const [search, setSearch] = useState("");
  const activity = useDownloadActivity();
  const now = useDownloadClock();
  const inspectorId = useInspectorSaveId();
  const inspectorMode = useInspectorMode();
  const rightPane = useRightPane();
  const live = useMemo(() => projectLiveDownloads(saves), [saves]);
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return live.filter(
      (row) =>
        !q ||
        [row.name, row.url, row.source, row.stage, row.error].some((value) =>
          value?.toLowerCase().includes(q),
        ),
    );
  }, [live, search]);
  const history = useInfiniteQuery({
    queryKey: ["downloads.history", search],
    initialPageParam: initialHistoryCursor,
    queryFn: async ({ pageParam }) =>
      HistoryPageSchema.parse(
        await window.pond.query("downloads.history", {
          limit: 50,
          cursor: pageParam,
          q: search,
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
  useEffect(() => {
    const available = new Map(
      [...rows, ...completed].map((row) => [row.id, row]),
    );
    downloadsSelection.set(
      downloadsSelection.snapshot().flatMap((row) => {
        const current = available.get(row.id);
        return current ? [current] : [];
      }),
    );
  }, [rows, completed]);
  useEffect(() => () => downloadsSelection.clear(), []);

  const pipeline = useQuery({
    queryKey: ["pipeline.status"],
    queryFn: async () =>
      PipelineStatusSchema.parse(
        await window.pond.query("pipeline.status", {}),
      ),
  });
  const paused = pipeline.data?.paused === true;
  const hasQuery = search.trim() !== "";
  const showPlaceEmpty = live.length === 0 && !hasQuery && rows.length === 0;
  const showMatchesEmpty =
    rows.length === 0 &&
    completed.length === 0 &&
    !history.isPending &&
    !showPlaceEmpty;

  const resetDownloadSearch = useCallback(() => {
    setSearch("");
  }, []);

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
                onClick={() => retry.mutate()}
              >
                <IconArrowRotateClockwiseFill18 />
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
      >
        <SearchChromeInput
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          spellCheck={false}
          placeholder="Search downloads…"
          aria-label="Search Downloads"
          data-downloads-search=""
        />
      </SearchChrome>

      {activity.isError ? (
        <p className={styles.activityError} role="status">
          Live activity is unavailable.{" "}
          <button type="button" onClick={() => void activity.refetch()}>
            Try Again
          </button>
        </p>
      ) : null}
      <TransferJobsPanel search={search} />
      <DownloadsView
        rows={rows}
        completed={completed}
        activities={activity.data ?? []}
        paused={paused}
        now={now}
        inspectedId={
          rightPane === "inspector" && inspectorMode === "download"
            ? inspectorId
            : null
        }
        onInspect={onRowClick}
        searching={hasQuery}
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
          ) : showMatchesEmpty && hasQuery ? (
            <div className={styles.empty}>
              <DownloadsMatchesEmpty onReset={resetDownloadSearch} />
            </div>
          ) : null
        }
      />
    </div>
  );
}
