import {
  IconArrowRotateClockwiseOutline18,
  IconArrowUpRightOutline18,
  IconBarsFilterOutline18,
  IconCircleCheckOutline18,
  IconCirclePauseOutline18,
  IconDownloadOutline18,
  IconFolderOpenOutline18,
  IconFolderOutline18,
  IconInputSearchOutline18,
  IconLayoutSidebarOutline18,
  IconLink2Outline18,
  IconMediaPauseOutline18,
  IconMediaPlayOutline18,
  IconMenuLeftOutline18,
  IconMenuRightOutline18,
  IconSidebarRightOutline18,
  IconTrashOutline18,
  IconXmarkOutline18,
} from "nucleo-ui-outline-18";
import { useMemo, useState } from "react";
import pondIcon from "../../../packages/icons/brand/icon.svg";

const initialDownloads = [
  {
    id: "d1",
    name: "Architecture references",
    source: "Cosmos",
    stage: "Fetching files",
    detail: "7 of 12 files",
    status: "active",
    progress: 64,
    time: "2m ago",
    size: "184 MB",
    origin: "cosmos.so/raphael/architecture",
    path: "~/Pond/Cosmos/Architecture references",
    started: "Today at 14:32",
  },
  {
    id: "d2",
    name: "Motion studies for desktop apps",
    source: "Pinterest",
    stage: "Downloading",
    detail: "3 of 9 files",
    status: "active",
    progress: 36,
    time: "5m ago",
    size: "92 MB",
    origin: "pinterest.com/pond/motion-studies",
    path: "~/Pond/Pinterest/Motion studies",
    started: "Today at 14:29",
  },
  {
    id: "d3",
    name: "Local-first interface patterns",
    source: "X",
    stage: "Waiting for X",
    detail: "Account pacing · next attempt in 3m",
    status: "waiting",
    progress: null,
    time: "8m ago",
    size: "—",
    origin: "x.com/bookmarks",
    path: "~/Pond/X/Local-first interface patterns",
    started: "Today at 14:26",
  },
  {
    id: "d4",
    name: "Editorial archive references",
    source: "Instagram",
    stage: "Failed",
    detail: "The signed media link expired",
    status: "failed",
    progress: null,
    time: "18m ago",
    size: "28 MB",
    origin: "instagram.com/saved/editorial",
    path: "~/Pond/Instagram/Editorial archive",
    started: "Today at 14:16",
  },
  {
    id: "d5",
    name: "Desktop download interfaces",
    source: "Cosmos",
    stage: "Ready",
    detail: "12 files",
    status: "complete",
    progress: 100,
    time: "Today, 13:48",
    size: "246 MB",
    origin: "cosmos.so/search/download-manager-ui",
    path: "~/Pond/Cosmos/Desktop download interfaces",
    started: "Today at 13:41",
  },
  {
    id: "d6",
    name: "Warm neutral color systems",
    source: "Pinterest",
    stage: "Ready",
    detail: "18 files",
    status: "complete",
    progress: 100,
    time: "Today, 12:21",
    size: "311 MB",
    origin: "pinterest.com/pond/warm-neutrals",
    path: "~/Pond/Pinterest/Warm neutral color systems",
    started: "Today at 12:12",
  },
  {
    id: "d7",
    name: "Inspector panel interaction notes",
    source: "X",
    stage: "Ready",
    detail: "6 files",
    status: "complete",
    progress: 100,
    time: "Yesterday, 18:07",
    size: "74 MB",
    origin: "x.com/i/bookmarks",
    path: "~/Pond/X/Inspector panel notes",
    started: "Yesterday at 18:02",
  },
  {
    id: "d8",
    name: "Museum wayfinding collection",
    source: "Instagram",
    stage: "Ready",
    detail: "23 files",
    status: "complete",
    progress: 100,
    time: "Yesterday, 09:12",
    size: "428 MB",
    origin: "instagram.com/saved/wayfinding",
    path: "~/Pond/Instagram/Museum wayfinding",
    started: "Yesterday at 08:56",
  },
];

const sources = [
  {
    name: "X",
    account: "@raphael",
    status: "Connected",
    sync: "9 minutes ago",
    downloads: 128,
  },
  {
    name: "Pinterest",
    account: "raphaelsalaja",
    status: "Connected",
    sync: "14 minutes ago",
    downloads: 84,
  },
  {
    name: "Instagram",
    account: "raphaelsalaja",
    status: "Needs attention",
    sync: "18 minutes ago",
    downloads: 63,
  },
  {
    name: "Cosmos",
    account: "raphaelsalaja",
    status: "Connected",
    sync: "2 minutes ago",
    downloads: 49,
  },
];
const statusLabels = {
  all: "All",
  active: "Active",
  waiting: "Waiting",
  failed: "Failed",
  complete: "Complete",
};

function IconButton({ label, children, active, onClick, disabled }) {
  return (
    <button
      type="button"
      className="icon-button"
      aria-label={label}
      title={label}
      data-active={active || undefined}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

function AppSidebar({ page, setPage }) {
  return (
    <aside className="app-sidebar">
      <div className="library-switcher">
        <img src={pondIcon} alt="" />
        <strong>Personal</strong>
        <IconMenuRightOutline18 />
      </div>
      <nav aria-label="Library navigation">
        <p className="nav-heading">Library</p>
        <button type="button">
          <IconFolderOutline18 />
          <span>All</span>
          <small>5,797</small>
        </button>
        <button type="button">
          <IconFolderOpenOutline18 />
          <span>Uncategorized</span>
          <small>5,797</small>
        </button>
        <button type="button">
          <IconLink2Outline18 />
          <span>Untagged</span>
          <small>5,794</small>
        </button>
        <p className="nav-heading harvest-heading">Harvesting</p>
        <button
          type="button"
          className={page === "downloads" ? "selected" : ""}
          onClick={() => setPage("downloads")}
        >
          <IconDownloadOutline18 />
          <span>Downloads</span>
          <small>36</small>
        </button>
        <button
          type="button"
          className={page === "sources" ? "selected" : ""}
          onClick={() => setPage("sources")}
        >
          <IconLink2Outline18 />
          <span>Sources</span>
          <small>4</small>
        </button>
        <p className="nav-heading">Smart Folders</p>
        <button type="button">
          <IconFolderOutline18 />
          <span>Research</span>
        </button>
        <button type="button">
          <IconFolderOutline18 />
          <span>References</span>
        </button>
      </nav>
    </aside>
  );
}

function WindowToolbar({ page, inspectorOpen, setInspectorOpen }) {
  return (
    <header className="window-toolbar">
      <div className="toolbar-start">
        <IconButton label="Toggle sidebar">
          <IconLayoutSidebarOutline18 />
        </IconButton>
        <span className="history-buttons">
          <IconButton label="Back">
            <IconMenuLeftOutline18 />
          </IconButton>
          <IconButton label="Forward" disabled>
            <IconMenuRightOutline18 />
          </IconButton>
        </span>
        <div className="breadcrumb">
          {page === "downloads" ? (
            <IconDownloadOutline18 />
          ) : (
            <IconLink2Outline18 />
          )}
          <strong>{page === "downloads" ? "Downloads" : "Sources"}</strong>
        </div>
      </div>
      <IconButton
        label="Toggle details"
        active={inspectorOpen}
        onClick={() => setInspectorOpen((open) => !open)}
      >
        <IconSidebarRightOutline18 />
      </IconButton>
    </header>
  );
}
function StatusDot({ status }) {
  return (
    <span className="status-dot" data-status={status} aria-hidden="true" />
  );
}

function DownloadsPage({
  inspectorOpen,
  setInspectorOpen,
  onOpenSources,
  initialSource,
}) {
  const [downloads, setDownloads] = useState(initialDownloads);
  const [status, setStatus] = useState("all");
  const [query, setQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState(
    initialSource || "All sources",
  );
  const [sourceMenuOpen, setSourceMenuOpen] = useState(false);
  const [queuePaused, setQueuePaused] = useState(false);
  const [selectedId, setSelectedId] = useState("d1");
  const [checked, setChecked] = useState([]);
  const [notice, setNotice] = useState("");
  const counts = useMemo(
    () =>
      Object.fromEntries(
        Object.keys(statusLabels).map((key) => [
          key,
          key === "all"
            ? downloads.length
            : downloads.filter((item) => item.status === key).length,
        ]),
      ),
    [downloads],
  );
  const visible = useMemo(
    () =>
      downloads.filter(
        (item) =>
          (status === "all" || item.status === status) &&
          (sourceFilter === "All sources" || item.source === sourceFilter) &&
          `${item.name} ${item.source} ${item.stage}`
            .toLowerCase()
            .includes(query.trim().toLowerCase()),
      ),
    [downloads, query, sourceFilter, status],
  );
  const selected = visible.find((item) => item.id === selectedId) ?? visible[0];
  const groups = [
    ["In progress", visible.filter((item) => item.status !== "complete")],
    [
      "Today",
      visible.filter(
        (item) => item.status === "complete" && item.time.startsWith("Today"),
      ),
    ],
    [
      "Yesterday",
      visible.filter(
        (item) =>
          item.status === "complete" && item.time.startsWith("Yesterday"),
      ),
    ],
  ];
  const toggleChecked = (id) =>
    setChecked((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  const retry = (ids) => {
    setDownloads((items) =>
      items.map((item) =>
        ids.includes(item.id) && item.status === "failed"
          ? {
              ...item,
              status: "waiting",
              stage: "Waiting",
              detail: "Retry queued · starts in a moment",
            }
          : item,
      ),
    );
    setNotice(
      ids.length === 1
        ? "Download queued to retry"
        : `${ids.length} downloads queued to retry`,
    );
    setChecked([]);
  };
  const removeHistory = () => {
    const removable = checked.filter(
      (id) => downloads.find((item) => item.id === id)?.status === "complete",
    );
    setDownloads((items) =>
      items.filter((item) => !removable.includes(item.id)),
    );
    setChecked([]);
    setNotice(
      `${removable.length} ${removable.length === 1 ? "entry" : "entries"} removed from history`,
    );
  };
  const select = (id) => {
    setSelectedId(id);
    setInspectorOpen(true);
  };
  return (
    <div className="workspace">
      <div className="downloads-main">
        <div className="downloads-toolbar">
          <label className="search-field">
            <IconInputSearchOutline18 />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search downloads…"
            />
          </label>
          <div className="toolbar-actions">
            <div className="source-filter-wrap">
              <button
                type="button"
                className="toolbar-button"
                data-active={sourceFilter !== "All sources" || undefined}
                onClick={() => setSourceMenuOpen((open) => !open)}
              >
                <IconBarsFilterOutline18 />
                {sourceFilter}
              </button>
              {sourceMenuOpen ? (
                <div className="source-menu">
                  {["All sources", "X", "Pinterest", "Instagram", "Cosmos"].map(
                    (source) => (
                      <button
                        type="button"
                        key={source}
                        onClick={() => {
                          setSourceFilter(source);
                          setSourceMenuOpen(false);
                        }}
                      >
                        <span>{source}</span>
                        {sourceFilter === source ? (
                          <IconCircleCheckOutline18 />
                        ) : null}
                      </button>
                    ),
                  )}
                </div>
              ) : null}
            </div>
            <IconButton
              label={queuePaused ? "Resume queue" : "Pause queue"}
              active={queuePaused}
              onClick={() => setQueuePaused((paused) => !paused)}
            >
              {queuePaused ? (
                <IconMediaPlayOutline18 />
              ) : (
                <IconMediaPauseOutline18 />
              )}
            </IconButton>
          </div>
        </div>
        <div
          className="status-tabs"
          role="tablist"
          aria-label="Download status"
        >
          {Object.entries(statusLabels).map(([key, label]) => (
            <button
              type="button"
              role="tab"
              aria-selected={status === key}
              key={key}
              onClick={() => setStatus(key)}
            >
              <span>{label}</span>
              <small>{counts[key]}</small>
            </button>
          ))}
        </div>
        {checked.length > 0 ? (
          <div className="selection-bar">
            <strong>{checked.length} selected</strong>
            <span />
            <button type="button" onClick={() => retry(checked)}>
              <IconArrowRotateClockwiseOutline18 />
              Retry eligible
            </button>
            <button type="button" onClick={removeHistory}>
              <IconTrashOutline18 />
              Remove completed
            </button>
            <IconButton label="Clear selection" onClick={() => setChecked([])}>
              <IconXmarkOutline18 />
            </IconButton>
          </div>
        ) : null}
        <div className="table-scroll">
          <div className="table-head">
            <span />
            <span>Name</span>
            <span>Source</span>
            <span>Stage</span>
            <span>Progress</span>
            <span>Added</span>
          </div>
          {visible.length === 0 ? (
            <div className="empty-state">
              <IconInputSearchOutline18 />
              <strong>No matching downloads</strong>
              <p>Try another status, source, or search.</p>
              <button
                type="button"
                onClick={() => {
                  setStatus("all");
                  setSourceFilter("All sources");
                  setQuery("");
                }}
              >
                Clear filters
              </button>
            </div>
          ) : (
            groups.map(([title, rows]) => (
              <DownloadGroup
                key={title}
                title={title}
                rows={rows}
                selectedId={selectedId}
                checked={checked}
                queuePaused={queuePaused}
                onSelect={select}
                onCheck={toggleChecked}
              />
            ))
          )}
        </div>
      </div>
      {inspectorOpen && selected ? (
        <DownloadInspector
          item={selected}
          queuePaused={queuePaused}
          onClose={() => setInspectorOpen(false)}
          onRetry={() => retry([selected.id])}
          onOpenSources={() => onOpenSources(selected.source)}
          onNotice={setNotice}
        />
      ) : null}
      {notice ? (
        <div className="toast" role="status">
          <IconCircleCheckOutline18 />
          <span>{notice}</span>
          <button
            type="button"
            onClick={() => setNotice("")}
            aria-label="Dismiss"
          >
            <IconXmarkOutline18 />
          </button>
        </div>
      ) : null}
    </div>
  );
}

function DownloadGroup({
  title,
  rows,
  selectedId,
  checked,
  queuePaused,
  onSelect,
  onCheck,
}) {
  if (rows.length === 0) return null;
  return (
    <section className="download-group">
      <h2>
        {title}
        <small>{rows.length}</small>
      </h2>
      {rows.map((item) => (
        <DownloadRow
          key={item.id}
          item={item}
          selected={selectedId === item.id}
          checked={checked.includes(item.id)}
          queuePaused={queuePaused}
          onSelect={() => onSelect(item.id)}
          onCheck={() => onCheck(item.id)}
        />
      ))}
    </section>
  );
}

function DownloadRow({
  item,
  selected,
  checked,
  queuePaused,
  onSelect,
  onCheck,
}) {
  const shownStage =
    queuePaused && item.status === "active" ? "Paused" : item.stage;
  const shownStatus =
    queuePaused && item.status === "active" ? "paused" : item.status;
  return (
    <div
      className="download-row"
      data-selected={selected || undefined}
      onClick={onSelect}
    >
      <label className="row-check" onClick={(event) => event.stopPropagation()}>
        <input
          type="checkbox"
          checked={checked}
          onChange={onCheck}
          aria-label={`Select ${item.name}`}
        />
      </label>
      <button type="button" className="row-name" onClick={onSelect}>
        <strong>{item.name}</strong>
        <small>{item.size}</small>
      </button>
      <span className="source-name">{item.source}</span>
      <span className="stage-cell">
        <StatusDot status={shownStatus} />
        <span>
          <strong>{shownStage}</strong>
          <small>{item.detail}</small>
        </span>
      </span>
      <span className="progress-cell">
        {item.status === "active" ? (
          <>
            <span className="progress-track">
              <i style={{ width: `${item.progress}%` }} />
            </span>
            <small>{queuePaused ? "Paused" : `${item.progress}%`}</small>
          </>
        ) : item.status === "complete" ? (
          <button
            type="button"
            className="text-action"
            onClick={(event) => {
              event.stopPropagation();
              onSelect();
            }}
          >
            <IconFolderOpenOutline18 />
            Reveal
          </button>
        ) : item.status === "failed" ? (
          <button
            type="button"
            className="text-action danger"
            onClick={(event) => {
              event.stopPropagation();
              onSelect();
            }}
          >
            <IconArrowRotateClockwiseOutline18 />
            Retry
          </button>
        ) : (
          <small>Queued</small>
        )}
      </span>
      <span className="time-cell">{item.time}</span>
    </div>
  );
}

function DownloadInspector({
  item,
  queuePaused,
  onClose,
  onRetry,
  onOpenSources,
  onNotice,
}) {
  const shownStatus =
    queuePaused && item.status === "active" ? "paused" : item.status;
  const shownStage =
    queuePaused && item.status === "active" ? "Paused" : item.stage;
  return (
    <aside className="inspector">
      <div className="inspector-header">
        <strong>Details</strong>
        <IconButton label="Close details" onClick={onClose}>
          <IconXmarkOutline18 />
        </IconButton>
      </div>
      <div className="inspector-scroll">
        <section className="inspector-hero">
          <div className="file-icon">
            <IconDownloadOutline18 />
          </div>
          <h1>{item.name}</h1>
          <div className="status-line">
            <StatusDot status={shownStatus} />
            <strong>{shownStage}</strong>
            <span>{item.time}</span>
          </div>
          {item.status === "active" ? (
            <div className="inspector-progress">
              <span>
                <i style={{ width: `${item.progress}%` }} />
              </span>
              <div>
                <small>{item.detail}</small>
                <strong>{queuePaused ? "Paused" : `${item.progress}%`}</strong>
              </div>
            </div>
          ) : null}
          <div className="inspector-actions">
            {item.status === "failed" ? (
              <button
                type="button"
                className="primary-action"
                onClick={onRetry}
              >
                <IconArrowRotateClockwiseOutline18 />
                Retry
              </button>
            ) : null}
            {item.status === "complete" ? (
              <button
                type="button"
                className="primary-action"
                onClick={() => onNotice("Opening downloaded save")}
              >
                <IconArrowUpRightOutline18 />
                Open
              </button>
            ) : null}
            {item.status === "complete" ? (
              <button
                type="button"
                onClick={() => onNotice("Revealed in Finder")}
              >
                <IconFolderOpenOutline18 />
                Reveal
              </button>
            ) : null}
            {item.status === "active" ? (
              <button
                type="button"
                onClick={() =>
                  onNotice(
                    queuePaused
                      ? "Queue remains paused"
                      : "This download is still active",
                  )
                }
              >
                <IconCirclePauseOutline18 />
                Pause
              </button>
            ) : null}
          </div>
        </section>
        {item.status === "failed" ? (
          <section className="failure-card">
            <strong>Download failed</strong>
            <p>
              {item.detail}. Retry to request a fresh link from {item.source}.
            </p>
          </section>
        ) : null}
        <InspectorSection title="Download">
          <Property label="Source">
            <button
              type="button"
              className="property-link"
              onClick={onOpenSources}
            >
              {item.source}
              <IconArrowUpRightOutline18 />
            </button>
          </Property>
          <Property label="Size">{item.size}</Property>
          <Property label="Started">{item.started}</Property>
          <Property label="Result">
            {item.status === "complete"
              ? "Available"
              : item.status === "failed"
                ? "Incomplete"
                : "In progress"}
          </Property>
        </InspectorSection>
        <InspectorSection title="Location">
          <Property label="Origin">{item.origin}</Property>
          <Property label="Folder">{item.path}</Property>
        </InspectorSection>
        <InspectorSection title="Activity">
          <ol className="activity-list">
            <li data-current={item.status !== "complete" || undefined}>
              <i />
              <span>
                <strong>{shownStage}</strong>
                <small>{item.detail}</small>
              </span>
            </li>
            <li>
              <i />
              <span>
                <strong>Save discovered</strong>
                <small>{item.started}</small>
              </span>
            </li>
          </ol>
        </InspectorSection>
      </div>
    </aside>
  );
}
function InspectorSection({ title, children }) {
  return (
    <section className="inspector-section">
      <h2>{title}</h2>
      <dl>{children}</dl>
    </section>
  );
}
function Property({ label, children }) {
  return (
    <div className="property">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function SourcesPage({ selectedSource, onViewDownloads }) {
  const [selected, setSelected] = useState(selectedSource || "Cosmos");
  const current =
    sources.find((source) => source.name === selected) ?? sources[0];
  return (
    <div className="sources-workspace">
      <div className="sources-main">
        <div className="sources-title">
          <div>
            <h1>Sources</h1>
            <p>Accounts and watches that bring saves into Pond.</p>
          </div>
          <button type="button">Add Source</button>
        </div>
        <div className="source-list" role="list">
          {sources.map((source) => (
            <button
              type="button"
              role="listitem"
              key={source.name}
              data-selected={selected === source.name || undefined}
              onClick={() => setSelected(source.name)}
            >
              <span className="source-avatar">{source.name.slice(0, 1)}</span>
              <span>
                <strong>{source.name}</strong>
                <small>{source.account}</small>
              </span>
              <span className="source-health">
                <StatusDot
                  status={source.status === "Connected" ? "complete" : "failed"}
                />
                {source.status}
              </span>
              <span>
                <small>Last sync</small>
                <strong>{source.sync}</strong>
              </span>
              <span>
                <small>Downloads</small>
                <strong>{source.downloads}</strong>
              </span>
            </button>
          ))}
        </div>
      </div>
      <aside className="source-inspector">
        <div className="inspector-header">
          <strong>Source</strong>
        </div>
        <div className="source-detail">
          <span className="source-avatar large">
            {current.name.slice(0, 1)}
          </span>
          <h2>{current.name}</h2>
          <p>{current.account}</p>
          <div className="source-summary">
            <span>
              <small>Status</small>
              <strong>{current.status}</strong>
            </span>
            <span>
              <small>Last sync</small>
              <strong>{current.sync}</strong>
            </span>
          </div>
          <button
            type="button"
            className="primary-action"
            onClick={() => onViewDownloads(current.name)}
          >
            <IconDownloadOutline18 />
            View {current.downloads} downloads
          </button>
          <button type="button">
            <IconArrowRotateClockwiseOutline18 />
            Sync now
          </button>
        </div>
      </aside>
    </div>
  );
}

export function App() {
  const [page, setPage] = useState("downloads");
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [selectedSource, setSelectedSource] = useState("");
  return (
    <main className="app-shell">
      <AppSidebar page={page} setPage={setPage} />
      <section className="app-content">
        <WindowToolbar
          page={page}
          inspectorOpen={inspectorOpen}
          setInspectorOpen={setInspectorOpen}
        />
        {page === "downloads" ? (
          <DownloadsPage
            inspectorOpen={inspectorOpen}
            setInspectorOpen={setInspectorOpen}
            initialSource={selectedSource}
            onOpenSources={(source) => {
              setSelectedSource(source);
              setPage("sources");
            }}
          />
        ) : (
          <SourcesPage
            selectedSource={selectedSource}
            onViewDownloads={(source) => {
              setSelectedSource(source);
              setPage("downloads");
              setInspectorOpen(true);
            }}
          />
        )}
      </section>
    </main>
  );
}
