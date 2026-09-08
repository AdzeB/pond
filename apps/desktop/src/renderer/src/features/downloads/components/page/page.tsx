import {
  IconDotsOutline18,
  IconMediaPauseOutline18,
  IconMediaPlayOutline18,
  IconRefreshOutline18,
} from "@pond/icons/outline/18";
import {
  Button,
  DataTable,
  Dialog,
  Menu,
  type RenderRowArgs,
  Tooltip,
} from "@pond/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { z } from "zod";
import {
  type DownloadFilters,
  type DownloadRow,
  defaultDownloadFilters,
  matchesDownloadFilters,
  PipelineStatusSchema,
  projectLiveDownloads,
  statusFeed,
} from "@/features/downloads/lib/status-feed";
import { downloadsSelection } from "@/features/downloads/state/downloads-selection";
import {
  DownloadsEmpty,
  MatchesEmpty,
} from "@/features/library/components/empty/empty";
import { TableSelectionSync } from "@/features/library/components/table-selection-sync";
import { useSaves } from "@/features/saves/hooks/use-saves";
import { refreshSaves } from "@/features/saves/lib/ensure-saves";
import { openSave } from "@/features/saves/lib/save-nav";
import {
  SearchChrome,
  SearchChromeInput,
} from "@/shared/components/search-chrome/search-chrome";
import { useClientHeight } from "@/shared/hooks/use-client-height";
import { retryDownloadRows } from "../lib/actions";
import { DownloadQueueRow, downloadsColumns } from "./columns";
import { IconSwap } from "./icon-swap";
import styles from "./page.module.css";

const InflightIdsSchema = z.array(z.string()).catch([]);
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
  const [filters, setFilters] = useState<DownloadFilters>(
    defaultDownloadFilters,
  );
  const { ref: tableRef, height: tableHeight } = useClientHeight();

  const live = useMemo(() => projectLiveDownloads(saves), [saves]);
  const rows = useMemo(
    () => live.filter((row) => matchesDownloadFilters(row, filters)),
    [live, filters],
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
  const hasQuery = filters.q.trim() !== "";
  const showPlaceEmpty = live.length === 0 && !hasQuery && rows.length === 0;
  const showMatchesEmpty = rows.length === 0 && !showPlaceEmpty;

  const resetDownloadSearch = useCallback(() => {
    setFilters(defaultDownloadFilters());
  }, []);

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
      height={
        rows.length === 0 || tableHeight < 88 ? undefined : tableHeight - 40
      }
      rowHeight={48}
      selectionCheckboxes={false}
      onRowClick={onRowClick}
      renderRow={renderRow}
    >
      <div className={styles.page}>
        <SearchChrome
          actions={
            <>
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
                  <IconSwap id={paused ? "play" : "pause"}>
                    {paused ? (
                      <IconMediaPlayOutline18 />
                    ) : (
                      <IconMediaPauseOutline18 />
                    )}
                  </IconSwap>
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
            <DownloadsMatchesEmpty onReset={resetDownloadSearch} />
          </div>
        ) : (
          <div ref={tableRef} className={styles.table}>
            <DataTable.Root className={styles.grid}>
              <DataTable.Empty>
                <DownloadsMatchesEmpty onReset={resetDownloadSearch} />
              </DataTable.Empty>
            </DataTable.Root>
          </div>
        )}
      </div>
      <TableSelectionSync selection={downloadsSelection} rowsById={rowsById} />
    </DataTable.Provider>
  );
}
