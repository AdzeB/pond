import { IconMagnifierOutline12 as Magnifier } from "@pond/icons/outline/12";
import type { Op, Source } from "@pond/schema/db";
import { Button, DataTable, Input, Menu, type MenuItemSpec } from "@pond/ui";
import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DownloadsEmpty, MatchesEmpty } from "@/components/library/empty";
import { TableSelectionSync } from "@/components/library/table-selection-sync";
import { confirm } from "@/components/shared/confirm-dialog";
import { useClientHeight } from "@/hooks/use-client-height";
import { useSaves } from "@/hooks/use-saves";
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
} from "@/lib/status-feed";
import { openSave } from "@/lib/ui/save-nav";
import { toggleInSet } from "@/lib/util/set";
import { downloadsSelection } from "@/stores/downloads-selection";
import { SOURCE_OPTIONS, STAGE_OPTIONS, STATUS_OPTIONS } from "../lib/filters";
import { downloadsColumns } from "./columns";
import styles from "./styles.module.css";

const INITIAL_CURSOR: HistoryCursor = null;

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
          <Menu.Popup>
            <Menu.Items items={items} />
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

export function DownloadsPage() {
  const saves = useSaves();
  const qc = useQueryClient();
  const [filters, setFilters] = useState<DownloadFilters>(
    defaultDownloadFilters,
  );
  const { ref: tableRef, height: tableHeight } = useClientHeight();

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
    enabled: filters.statuses.has("complete"),
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
    if (!filters.statuses.has("complete")) return;
    for (const id of prev) {
      if (!liveIds.has(id)) {
        void qc.invalidateQueries({ queryKey: ["downloads.history"] });
        break;
      }
    }
  }, [liveIds, filters.statuses, qc]);

  const history = useMemo(() => {
    if (!filters.statuses.has("complete")) return [];
    return (historyQuery.data?.pages ?? []).flatMap((page) =>
      page.rows.map(historyToDownloadRow),
    );
  }, [filters.statuses, historyQuery.data]);

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

  const countLabel =
    rows.length === 1 ? "1 item" : `${rows.length.toLocaleString()} items`;

  const hasDefault =
    filters.statuses.has("in-progress") &&
    filters.statuses.has("failed") &&
    !filters.statuses.has("complete") &&
    filters.sources.size === 0 &&
    filters.ops.size === 0 &&
    filters.q.trim() === "";
  const emptyLibrary = live.length === 0 && !filters.statuses.has("complete");
  const historyPending =
    filters.statuses.has("complete") && historyQuery.isPending;
  const showPlaceEmpty = emptyLibrary && hasDefault && rows.length === 0;
  const showMatchesEmpty =
    rows.length === 0 && !showPlaceEmpty && !historyPending;

  const setStatuses = (id: StatusFilter, on: boolean) => {
    setFilters((cur) => ({
      ...cur,
      statuses: toggleInSet(cur.statuses, id, on),
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

  const statusItems: MenuItemSpec[] = STATUS_OPTIONS.map((opt) => ({
    type: "checkbox",
    label: opt.label,
    checked: filters.statuses.has(opt.id),
    closeOnClick: false,
    onCheckedChange: (on) => setStatuses(opt.id, on),
  }));
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

  const togglePause = async () => {
    await window.pond.pipelinePause(!paused);
    await qc.invalidateQueries({ queryKey: ["pipeline.status"] });
  };

  const retryFailed = async () => {
    await window.pond.query("saves.retryFailed", {});
  };

  const cancelAll = () => {
    confirm({
      title: "Cancel All",
      description:
        "Pond stops every save that is ingesting. Failed items stay so you can retry them.",
      confirmLabel: "Cancel All",
      confirmVariant: "destructive",
      onConfirm: async () => {
        await window.pond.pipelineCancelAll();
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
      defaultSort={{ id: "time", desc: true }}
      height={
        showPlaceEmpty || showMatchesEmpty || tableHeight < 76
          ? undefined
          : tableHeight - 28
      }
      onRowClick={onRowClick}
    >
      <div className={styles.page}>
        <DataTable.Toolbar className={styles.toolbar}>
          <Input.Root className={styles.search} size="sm">
            <Input.Icon>
              <Magnifier />
            </Input.Icon>
            <Input.Field
              value={filters.q}
              onChange={(e) =>
                setFilters((cur) => ({ ...cur, q: e.target.value }))
              }
              spellCheck={false}
              placeholder="Search…"
            />
          </Input.Root>
          <FilterMenu label="Status" items={statusItems} />
          <FilterMenu label="Source" items={sourceItems} />
          <FilterMenu label="Stage" items={stageItems} />
          <span className={styles.count}>{countLabel}</span>
          <span className={styles.spacer} />
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void retryFailed()}
          >
            Retry Failed
          </Button>
          <Button variant="secondary" size="sm" onClick={cancelAll}>
            Cancel All
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void togglePause()}
          >
            {paused ? "Resume" : "Pause"}
          </Button>
        </DataTable.Toolbar>

        {showPlaceEmpty ? (
          <div className={styles.empty}>
            <DownloadsEmpty />
          </div>
        ) : showMatchesEmpty ? (
          <div className={styles.empty}>
            <MatchesEmpty />
          </div>
        ) : (
          <div ref={tableRef} className={styles.table}>
            <DataTable.Root>
              <DataTable.Empty>
                {historyPending ? null : <MatchesEmpty />}
              </DataTable.Empty>
              {historyQuery.hasNextPage ? (
                <DataTable.ExtraRow>
                  <div className={styles.more}>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={historyQuery.isFetchingNextPage}
                      onClick={() => void historyQuery.fetchNextPage()}
                    >
                      Load More
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
