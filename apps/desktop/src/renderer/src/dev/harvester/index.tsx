/** Standalone window prototype for sources and downloads. */
import { IconMediaPauseFill18, IconMediaPlayFill18 } from "@pond/icons/fill/18";
import {
  IconArrowDiagonalInOutline18,
  IconWindowDownloadOutline18,
} from "@pond/icons/outline/18";
import { sourceLabel } from "@pond/schema/sources";
import { Button, Empty, Sidebar, TitleBar, Tooltip } from "@pond/ui";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { BrandTile } from "@/features/sources/components/sync-monitor-source-tile";
import { SearchChrome } from "@/shared/components/search-chrome";
import "../../styles.css";
import {
  type DownloadStatus,
  type HarvesterDownload,
  type HarvesterSource,
  INITIAL_DOWNLOADS,
  INITIAL_SOURCES,
  type SourceStatus,
} from "./fixtures";
import styles from "./styles.module.css";

type Section = "sources" | "downloads";

const TICK_MS = 500;
const RING = 100;

function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 B";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  if (bytes < 1024 * 1024 * 1024) {
    const mb = bytes / (1024 * 1024);
    const text = mb >= 10 ? Math.round(mb).toString() : mb.toFixed(1);
    return `${text.endsWith(".0") ? text.slice(0, -2) : text} MB`;
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function formatCount(value: number): string {
  return value.toLocaleString("en-US");
}

function formatEta(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 1) return "Finishing";
  if (seconds < 60) return `${Math.ceil(seconds)} seconds left`;
  const minutes = Math.ceil(seconds / 60);
  return minutes === 1 ? "1 minute left" : `${minutes} minutes left`;
}

function sourceStatusLabel(status: SourceStatus): string {
  if (status === "syncing") return "Syncing";
  if (status === "error") return "Error";
  if (status === "paused") return "Paused";
  return "Active";
}

function downloadStatusLabel(
  status: DownloadStatus,
  queuePaused: boolean,
): string {
  if (status === "downloading" && queuePaused) return "Paused";
  if (status === "downloading") return "Downloading";
  if (status === "completed") return "Completed";
  if (status === "error") return "Error";
  return "Paused";
}

function displayedDownloadStatus(
  status: DownloadStatus,
  queuePaused: boolean,
): DownloadStatus {
  if (status === "downloading" && queuePaused) return "paused";
  return status;
}

function StatusGlyph({
  status,
}: {
  status: SourceStatus | DownloadStatus | "complete";
}) {
  const complete =
    status === "active" || status === "completed" || status === "complete";
  const progress = status === "syncing" || status === "downloading";
  const failed = status === "error";
  const paused = status === "paused";
  return (
    <svg
      className={styles.glyph}
      width="16"
      height="16"
      viewBox="0 0 16 16"
      aria-hidden
    >
      <title>{status}</title>
      <circle
        cx="8"
        cy="8"
        r="6"
        fill={complete ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.5"
        opacity={complete ? 1 : 0.45}
      />
      {progress ? (
        <circle
          cx="8"
          cy="8"
          r="6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeDasharray={`${0.65 * RING} ${RING}`}
          pathLength={RING}
          transform="rotate(-90 8 8)"
        />
      ) : null}
      {complete ? (
        <path
          d="M5.2 8.2 7 10 10.8 6"
          fill="none"
          stroke="var(--ds-gray-1)"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : null}
      {failed ? (
        <path
          d="M5.6 5.6 10.4 10.4 M10.4 5.6 5.6 10.4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      ) : null}
      {paused ? (
        <>
          <rect x="5.55" y="5.35" width="1.55" height="5.3" rx="0.4" />
          <rect x="8.9" y="5.35" width="1.55" height="5.3" rx="0.4" />
        </>
      ) : null}
    </svg>
  );
}

function matchesQuery(values: string[], query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return values.some((value) => value.toLowerCase().includes(needle));
}

function Harvester() {
  const [section, setSection] = useState<Section>("downloads");
  const [query, setQuery] = useState("");
  const [queuePaused, setQueuePaused] = useState(false);
  const [sources, setSources] = useState(INITIAL_SOURCES);
  const [downloads, setDownloads] = useState(INITIAL_DOWNLOADS);
  const [selectedSourceId, setSelectedSourceId] = useState(
    INITIAL_SOURCES[0]?.id ?? "",
  );
  const [selectedDownloadId, setSelectedDownloadId] = useState(
    INITIAL_DOWNLOADS[0]?.id ?? "",
  );

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      document.documentElement.dataset.theme = media.matches ? "dark" : "light";
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (queuePaused) return;
    const timer = window.setInterval(() => {
      setDownloads((current) =>
        current.map((item) => {
          if (item.status !== "downloading" || item.total <= 0) return item;
          const received = Math.min(
            item.total,
            item.received + item.speed * (TICK_MS / 1000),
          );
          if (received >= item.total) {
            return { ...item, received, status: "completed", speed: 0 };
          }
          return { ...item, received };
        }),
      );
    }, TICK_MS);
    return () => window.clearInterval(timer);
  }, [queuePaused]);

  const visibleSources = useMemo(
    () =>
      sources.filter((item) =>
        matchesQuery(
          [
            item.name,
            item.kind,
            sourceLabel(item.source),
            sourceStatusLabel(item.status),
          ],
          query,
        ),
      ),
    [query, sources],
  );
  const visibleDownloads = useMemo(
    () =>
      downloads.filter((item) =>
        matchesQuery(
          [
            item.name,
            sourceLabel(item.source),
            downloadStatusLabel(item.status, queuePaused),
          ],
          query,
        ),
      ),
    [downloads, query, queuePaused],
  );
  const activeDownloads = downloads.filter(
    (item) => item.status === "downloading",
  ).length;
  const selectedSource =
    sources.find((item) => item.id === selectedSourceId) ?? null;
  const selectedDownload =
    downloads.find((item) => item.id === selectedDownloadId) ?? null;

  const activity =
    queuePaused && activeDownloads > 0
      ? "Queue paused"
      : activeDownloads > 0
        ? activeDownloads === 1
          ? "1 downloading"
          : `${activeDownloads} downloading`
        : "Idle";

  return (
    <Tooltip.Provider>
      <div className={styles.window}>
        <TitleBar.Root>
          <TitleBar.Title>
            <TitleBar.Label>Harvester</TitleBar.Label>
          </TitleBar.Title>
        </TitleBar.Root>
        <div className={styles.body}>
          <Sidebar.Root className={styles.sidebar}>
            <Sidebar.Scroll>
              <Sidebar.Item
                aria-current={section === "sources" ? "page" : undefined}
                data-status={section === "sources" ? "active" : undefined}
                onClick={() => setSection("sources")}
              >
                <Sidebar.Icon>
                  <IconArrowDiagonalInOutline18 />
                </Sidebar.Icon>
                <Sidebar.ItemLabel>Sources</Sidebar.ItemLabel>
                <Sidebar.Count>{sources.length}</Sidebar.Count>
              </Sidebar.Item>
              <Sidebar.Item
                aria-current={section === "downloads" ? "page" : undefined}
                data-status={section === "downloads" ? "active" : undefined}
                onClick={() => setSection("downloads")}
              >
                <Sidebar.Icon>
                  <IconWindowDownloadOutline18 />
                </Sidebar.Icon>
                <Sidebar.ItemLabel>Downloads</Sidebar.ItemLabel>
                <Sidebar.Count>
                  {activeDownloads || downloads.length}
                </Sidebar.Count>
              </Sidebar.Item>
            </Sidebar.Scroll>
            <Sidebar.Footer>
              <p className={styles.activity}>{activity}</p>
            </Sidebar.Footer>
          </Sidebar.Root>
          <main className={styles.panel}>
            <SearchChrome.Root
              actions={
                section === "sources" ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      const next = sources.filter((item) =>
                        item.name.startsWith("Desktop inbox"),
                      ).length;
                      const item: HarvesterSource = {
                        id: `desktop-inbox-${next + 1}`,
                        name:
                          next === 0
                            ? "Desktop inbox"
                            : `Desktop inbox ${next + 1}`,
                        kind: "Watch",
                        source: "local",
                        status: "active",
                        detail: "Watching now.",
                        items: 0,
                      };
                      setSources((current) => [item, ...current]);
                      setSelectedSourceId(item.id);
                    }}
                  >
                    New Source
                  </Button>
                ) : (
                  <Tooltip
                    label={queuePaused ? "Resume downloads" : "Pause downloads"}
                    side="bottom"
                  >
                    <Button
                      icon
                      size="sm"
                      variant="ghost"
                      aria-label={queuePaused ? "Resume Queue" : "Pause Queue"}
                      onClick={() => setQueuePaused((paused) => !paused)}
                    >
                      {queuePaused ? (
                        <IconMediaPlayFill18 />
                      ) : (
                        <IconMediaPauseFill18 />
                      )}
                    </Button>
                  </Tooltip>
                )
              }
            >
              <SearchChrome.Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                spellCheck={false}
                placeholder={
                  section === "sources"
                    ? "Search sources…"
                    : "Search downloads…"
                }
                aria-label={
                  section === "sources" ? "Search Sources" : "Search Downloads"
                }
              />
            </SearchChrome.Root>
            {section === "sources" ? (
              <SourceTable
                rows={visibleSources}
                selectedId={selectedSourceId}
                onSelect={setSelectedSourceId}
              />
            ) : (
              <DownloadTable
                rows={visibleDownloads}
                queuePaused={queuePaused}
                selectedId={selectedDownloadId}
                onSelect={setSelectedDownloadId}
              />
            )}
            {section === "sources" ? (
              <SourceDetail
                item={selectedSource}
                onRetry={(id) =>
                  setSources((current) =>
                    current.map((item) =>
                      item.id === id
                        ? {
                            ...item,
                            status: "syncing",
                            detail: "Checking for new posts.",
                          }
                        : item,
                    ),
                  )
                }
              />
            ) : (
              <DownloadDetail
                item={selectedDownload}
                queuePaused={queuePaused}
                onPause={(id) =>
                  setDownloads((current) =>
                    current.map((item) =>
                      item.id === id ? { ...item, status: "paused" } : item,
                    ),
                  )
                }
                onResume={(id) =>
                  setDownloads((current) =>
                    current.map((item) =>
                      item.id === id
                        ? { ...item, status: "downloading", error: "" }
                        : item,
                    ),
                  )
                }
              />
            )}
          </main>
        </div>
      </div>
    </Tooltip.Provider>
  );
}

function SourceTable({
  rows,
  selectedId,
  onSelect,
}: {
  rows: HarvesterSource[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  if (rows.length === 0) {
    return (
      <div className={styles.empty}>
        <Empty.Root>
          <Empty.Title>No results found</Empty.Title>
          <Empty.Description>
            Try another name or clear the search.
          </Empty.Description>
        </Empty.Root>
      </div>
    );
  }
  return (
    <div className={styles.table} data-section="sources">
      <div className={styles.head}>
        <span>Name</span>
        <span>Kind</span>
        <span>Status</span>
        <span>Saves</span>
      </div>
      <div className={styles.scroll}>
        {rows.map((item) => (
          <button
            key={item.id}
            type="button"
            className={styles.row}
            data-selected={item.id === selectedId || undefined}
            onClick={() => onSelect(item.id)}
          >
            <span className={styles.lead}>
              <BrandTile source={item.source} size={18} />
              <span className={styles.name}>{item.name}</span>
            </span>
            <span className={styles.metric}>{item.kind}</span>
            <span className={styles.status} data-status={item.status}>
              <StatusGlyph status={item.status} />
              {sourceStatusLabel(item.status)}
            </span>
            <span className={styles.metric}>{formatCount(item.items)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function DownloadTable({
  rows,
  queuePaused,
  selectedId,
  onSelect,
}: {
  rows: HarvesterDownload[];
  queuePaused: boolean;
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  if (rows.length === 0) {
    return (
      <div className={styles.empty}>
        <Empty.Root>
          <Empty.Title>No results found</Empty.Title>
          <Empty.Description>
            Try another name or clear the search.
          </Empty.Description>
        </Empty.Root>
      </div>
    );
  }
  return (
    <div className={styles.table} data-section="downloads">
      <div className={styles.head}>
        <span>Name</span>
        <span>Status</span>
        <span>Speed</span>
      </div>
      <div className={styles.scroll}>
        {rows.map((item) => {
          const status = displayedDownloadStatus(item.status, queuePaused);
          const percent =
            item.total > 0
              ? Math.min(100, (item.received / item.total) * 100)
              : 0;
          const moving = item.status === "downloading" && !queuePaused;
          return (
            <button
              key={item.id}
              type="button"
              className={styles.row}
              data-selected={item.id === selectedId || undefined}
              onClick={() => onSelect(item.id)}
            >
              <span className={styles.lead}>
                <BrandTile source={item.source} size={18} />
                <span className={styles.identity}>
                  <span className={styles.name}>{item.name}</span>
                  <span className={styles.track} data-status={status}>
                    <span
                      className={styles.fill}
                      style={{ width: `${percent}%` }}
                    />
                  </span>
                </span>
              </span>
              <span className={styles.status} data-status={status}>
                <StatusGlyph
                  status={status === "completed" ? "complete" : status}
                />
                {downloadStatusLabel(item.status, queuePaused)}
              </span>
              <span className={styles.metric}>
                {moving ? `${formatBytes(item.speed)}/s` : ""}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SourceDetail({
  item,
  onRetry,
}: {
  item: HarvesterSource | null;
  onRetry: (id: string) => void;
}) {
  if (!item) return <DetailShell name="Sources" meta="Select a source." />;
  const saves =
    item.items === 1 ? "1 save" : `${formatCount(item.items)} saves`;
  const place = item.source === "local" ? "this Mac" : sourceLabel(item.source);
  return (
    <DetailShell
      name={item.name}
      meta={`${item.kind} on ${place}. ${saves}. ${item.detail}`}
      actions={
        item.status === "error" ? (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onRetry(item.id)}
          >
            Retry
          </Button>
        ) : null
      }
    />
  );
}

function DownloadDetail({
  item,
  queuePaused,
  onPause,
  onResume,
}: {
  item: HarvesterDownload | null;
  queuePaused: boolean;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
}) {
  if (!item) return <DetailShell name="Downloads" meta="Select a download." />;
  const moving = item.status === "downloading" && !queuePaused;
  const remaining =
    item.speed > 0
      ? (item.total - item.received) / item.speed
      : Number.POSITIVE_INFINITY;
  let meta = item.error;
  if (item.status === "completed") meta = "Saved to the library.";
  else if (
    item.status === "paused" ||
    (item.status === "downloading" && queuePaused)
  ) {
    meta = "Paused. Resume to keep going.";
  } else if (moving) {
    meta = `${formatBytes(item.received)} of ${formatBytes(item.total)}. ${formatBytes(item.speed)}/s. ${formatEta(remaining)}.`;
  }
  return (
    <DetailShell
      name={item.name}
      meta={meta}
      actions={
        item.status === "downloading" && !queuePaused ? (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onPause(item.id)}
          >
            Pause
          </Button>
        ) : item.status === "paused" || item.status === "error" ? (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onResume(item.id)}
          >
            {item.status === "error" ? "Retry" : "Resume"}
          </Button>
        ) : null
      }
    />
  );
}

function DetailShell({
  name,
  meta,
  actions,
}: {
  name: string;
  meta: string;
  actions?: ReactNode;
}) {
  return (
    <div className={styles.detail}>
      <div className={styles.copy}>
        <span className={styles["detail-name"]}>{name}</span>
        <p className={styles["detail-meta"]}>{meta}</p>
      </div>
      {actions ? <div className={styles.actions}>{actions}</div> : null}
    </div>
  );
}

declare global {
  interface Window {
    __pondHarvesterRoot?: Root;
  }
}

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("#root element missing");
window.__pondHarvesterRoot ??= createRoot(rootElement);
window.__pondHarvesterRoot.render(<Harvester />);
