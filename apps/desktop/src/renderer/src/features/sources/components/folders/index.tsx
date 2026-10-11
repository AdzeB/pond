import { IconFolderOpenFill18 } from "@pond/icons/fill/18";
import { Button, DataTable, Empty, type TableColumn } from "@pond/ui";
import { useMemo, useState } from "react";
import {
  useWatchedFolder,
  type WatchedFolderStatus,
  watchedFolderName,
} from "@/features/sources/hooks/use-watched-folder";
import { pickWatchedFolder } from "@/features/sources/lib/watched-folder";
import { MatchesEmpty } from "@/shared/components/matches-empty";
import { SearchChrome } from "@/shared/components/search-chrome";
import { useClientHeight } from "@/shared/hooks/use-client-height";
import { formatNumber } from "@/shared/lib/format";
import { prettyPath } from "@/shared/lib/pretty-path";
import { relativeTimeFromMs } from "@/shared/lib/relative-time";
import styles from "./styles.module.css";

interface FolderRow {
  id: string;
  name: string;
  path: string;
  imported: number;
  lastImportedMs: number | null;
  watching: boolean;
}

function toFolderRow(status: WatchedFolderStatus): FolderRow | null {
  if (!status.path) return null;
  const imported = status.history.filter((entry) => entry.ok);
  const last = imported[0]?.at ?? status.history[0]?.at ?? null;
  return {
    id: status.path,
    name: watchedFolderName(status.path),
    path: prettyPath(status.path),
    imported: imported.length,
    lastImportedMs: last,
    watching: status.enabled,
  };
}

const columns: TableColumn<FolderRow>[] = [
  {
    id: "name",
    header: "Name",
    sortLabel: "Name",
    accessor: (row) => row.name,
    width: "minmax(180px, 1fr)",
    reorderable: true,
    cell: (row) => <span className={styles.name}>{row.name}</span>,
  },
  {
    id: "imported",
    header: "Imported",
    sortLabel: "Imported",
    accessor: (row) => row.imported,
    width: "minmax(0, 100px)",
    reorderable: true,
    cell: (row) => (
      <span className={styles.count}>{formatNumber(row.imported)}</span>
    ),
  },
  {
    id: "location",
    header: "Location",
    sortLabel: "Location",
    accessor: (row) => row.path,
    width: "minmax(180px, 1.4fr)",
    reorderable: true,
    cell: (row) => <span className={styles.path}>{row.path}</span>,
  },
  {
    id: "lastImported",
    header: "Last Imported",
    sortLabel: "Last Imported",
    accessor: (row) => row.lastImportedMs ?? Number.NEGATIVE_INFINITY,
    width: "minmax(0, 140px)",
    reorderable: true,
    cell: (row) => (
      <span className={styles.when}>
        {relativeTimeFromMs(row.lastImportedMs)}
      </span>
    ),
  },
  {
    id: "status",
    header: "Status",
    sortLabel: "Status",
    accessor: (row) => (row.watching ? "Watching" : "Off"),
    width: "minmax(0, 120px)",
    reorderable: true,
    cell: (row) => (
      <span className={styles.status} data-watching={row.watching || undefined}>
        {row.watching ? "Watching" : "Off"}
      </span>
    ),
  },
];

export function FoldersPage() {
  const watched = useWatchedFolder();
  const [query, setQuery] = useState("");
  const [picking, setPicking] = useState(false);
  const { ref: tableRef, height: tableHeight } = useClientHeight();
  const folder = useMemo(
    () => (watched.data ? toFolderRow(watched.data) : null),
    [watched.data],
  );
  const needle = query.trim().toLowerCase();
  const rows = useMemo(() => {
    if (!folder) return [];
    if (!needle) return [folder];
    const haystack = `${folder.name} ${folder.path}`.toLowerCase();
    return haystack.includes(needle) ? [folder] : [];
  }, [folder, needle]);
  const settled = !watched.isFetching && (watched.isSuccess || watched.isError);
  const showMatchesEmpty = settled && folder != null && rows.length === 0;

  async function chooseFolder(): Promise<void> {
    setPicking(true);
    try {
      await pickWatchedFolder();
    } finally {
      setPicking(false);
    }
  }

  const toolbar = (
    <SearchChrome.Root>
      <SearchChrome.Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        spellCheck={false}
        placeholder="Search folders…"
        aria-label="Search Folders"
      />
    </SearchChrome.Root>
  );

  return (
    <DataTable.Provider
      data={rows}
      columns={columns}
      getRowId={(row) => row.id}
      defaultSort={{ id: "name", desc: false }}
      height={
        showMatchesEmpty || tableHeight < 88 ? undefined : tableHeight - 40
      }
      rowHeight={48}
      selectionCheckboxes={false}
      selectOnClick={false}
    >
      {toolbar}
      <div className={styles.page}>
        <div className={styles.content}>
          {settled && !folder ? (
            <div className={styles.empty}>
              <Empty.Root>
                <Empty.Media>
                  <IconFolderOpenFill18 />
                </Empty.Media>
                <Empty.Title>No folders yet</Empty.Title>
                <Empty.Description>
                  Choose a folder. Pond imports new files from it.
                </Empty.Description>
                <Empty.Action>
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={picking}
                    loading={picking}
                    onClick={() => void chooseFolder()}
                  >
                    New Folder
                  </Button>
                </Empty.Action>
              </Empty.Root>
            </div>
          ) : showMatchesEmpty ? (
            <div className={styles.empty}>
              <MatchesEmpty onReset={() => setQuery("")} />
            </div>
          ) : folder ? (
            <div ref={tableRef} className={styles.table}>
              <DataTable.Root className={styles.grid} aria-label="Folders">
                <DataTable.Empty>
                  {settled ? (
                    <MatchesEmpty onReset={() => setQuery("")} />
                  ) : null}
                </DataTable.Empty>
              </DataTable.Root>
            </div>
          ) : null}
        </div>
      </div>
    </DataTable.Provider>
  );
}
