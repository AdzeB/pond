import {
  IconCircleXmarkFill18,
  IconMediaPauseFill18,
  IconMediaPlayFill18,
  IconRefreshFill18,
} from "@pond/icons/fill/18";
import { IconChevronLeftOutline12 } from "@pond/icons/outline/12";
import {
  IconBarsFilterOutline18,
  IconDotsOutline18,
  IconMagnifierOutline18,
  IconRefreshOutline18,
} from "@pond/icons/outline/18";
import { Button, DataTable, Logo, Tooltip } from "@pond/ui";
import { useState } from "react";
import selectionStyles from "@/components/library/dock/selection/styles.module.css";
import {
  DownloadQueueRow,
  downloadsColumns,
} from "@/components/library/downloads/page/columns";
import downloadStyles from "@/components/library/downloads/page/styles.module.css";
import { DownloadsEmpty, MatchesEmpty } from "@/components/library/empty";
import { DownloadingBadge } from "@/components/save/card/media/downloading-badge";
import type { DownloadRow } from "@/lib/status-feed";
import type { Save } from "@/lib/types";
import styles from "./styles.module.css";

const NOW = Date.now();

const ROWS: DownloadRow[] = [
  {
    id: "lab-running",
    saveId: "lab-running",
    name: "The architecture of a calm interface",
    url: "https://x.com/example/status/1",
    source: "twitter",
    status: "running",
    stage: "Downloading media",
    op: "fetch_blobs",
    progress: 0.42,
    attempts: 1,
    error: null,
    ts: NOW,
    durationMs: null,
    live: true,
  },
  {
    id: "lab-processing",
    saveId: "lab-processing",
    name: "Brutalist web design archive",
    url: "https://www.are.na/example/channel",
    source: "are.na",
    status: "running",
    stage: "Making preview",
    op: "ensure_poster",
    progress: 0.78,
    attempts: 1,
    error: null,
    ts: NOW - 45_000,
    durationMs: null,
    live: true,
  },
  {
    id: "lab-pending",
    saveId: "lab-pending",
    name: "Visual references for quiet software",
    url: "https://example.com/quiet-software",
    source: "web",
    status: "pending",
    stage: null,
    op: "harvest_metadata",
    progress: 0,
    attempts: 0,
    error: null,
    ts: NOW - 90_000,
    durationMs: null,
    live: true,
  },
  {
    id: "lab-blocked",
    saveId: "lab-blocked",
    name: "A reference that is waiting to retry",
    url: "https://youtube.com/watch?v=example",
    source: "youtube",
    status: "blocked",
    stage: "Downloading video",
    op: "fetch_video_ytdlp",
    progress: 0.2,
    attempts: 2,
    error: "The source is temporarily unavailable. Pond will try again.",
    ts: NOW - 180_000,
    durationMs: null,
    live: true,
  },
  {
    id: "lab-failed",
    saveId: "lab-failed",
    name: "Unavailable image collection",
    url: "https://instagram.com/p/example",
    source: "instagram",
    status: "failed",
    stage: "Fetching files",
    op: "fetch_blobs",
    progress: null,
    attempts: 3,
    error: "The download link expired before the file could be saved.",
    ts: NOW - 360_000,
    durationMs: 18_000,
    live: false,
  },
  {
    id: "lab-complete",
    saveId: "lab-complete",
    name: "Typography details worth keeping",
    url: "https://example.com/typography",
    source: "web",
    status: "complete",
    stage: "Saved",
    op: "finalize",
    progress: null,
    attempts: 1,
    error: null,
    ts: NOW - 7_200_000,
    durationMs: 12_400,
    live: false,
  },
];

const BADGE_SAVE: Save = {
  id: "lab-badge",
  source: "web",
  sourceId: "lab-badge",
  url: "https://example.com/download",
  title: "Download badge preview",
  description: null,
  author: null,
  notes: null,
  mediaUrl: null,
  mediaType: "image",
  files: [],
  tags: [],
  savedAt: NOW,
  createdAt: NOW,
  deletedAt: null,
};

const FAILED_BADGE_SAVE: Save = {
  ...BADGE_SAVE,
  id: "lab-badge-failed",
  status: "failed",
  tasks: [
    {
      op: "fetch_blobs",
      status: "failed",
      attempts: 3,
      maxAttempts: 3,
      lastError: "The original file is no longer available.",
      nextRunAt: 0,
      updatedAt: NOW,
    },
  ],
};

const SECTIONS = [
  ["chrome", "Toolbar and filters"],
  ["queue", "Queue rows"],
  ["empty", "Empty states"],
  ["feedback", "Feedback states"],
  ["selection", "Selection actions"],
  ["badges", "Card badges"],
] as const;

function Specimen({
  id,
  title,
  path,
  children,
}: {
  id: string;
  title: string;
  path: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className={styles.specimen}>
      <header className={styles.specimenHeader}>
        <h2>{title}</h2>
        <code>{path}</code>
      </header>
      {children}
    </section>
  );
}

function ToolbarSpecimen({
  paused,
  onPausedChange,
}: {
  paused: boolean;
  onPausedChange: (paused: boolean) => void;
}) {
  const [filtersOpen, setFiltersOpen] = useState(true);
  return (
    <div className={styles.surface}>
      <div className={downloadStyles.header}>
        <div className={downloadStyles.toolbar}>
          <span className={downloadStyles.searchIcon} aria-hidden="true">
            <IconMagnifierOutline18 />
          </span>
          <input
            className={downloadStyles.search}
            placeholder="Search downloads…"
            aria-label="Search Downloads Preview"
          />
          <div className={downloadStyles.actions}>
            <Button
              icon
              size="sm"
              variant="ghost"
              className={downloadStyles.filterTrigger}
              aria-label="Toggle Filters"
              aria-expanded={filtersOpen}
              data-active={filtersOpen || undefined}
              onClick={() => setFiltersOpen((open) => !open)}
            >
              <IconBarsFilterOutline18 />
              <span className={downloadStyles.filterDot} />
            </Button>
            <Button icon size="sm" variant="ghost" aria-label="Retry Failed">
              <IconRefreshOutline18 />
            </Button>
            <Button
              icon
              size="sm"
              variant="ghost"
              aria-label={paused ? "Resume Queue" : "Pause Queue"}
              aria-pressed={paused}
              onClick={() => onPausedChange(!paused)}
            >
              {paused ? <IconMediaPlayFill18 /> : <IconMediaPauseFill18 />}
            </Button>
            <Button icon size="sm" variant="ghost" aria-label="More Actions">
              <IconDotsOutline18 />
            </Button>
          </div>
        </div>
        <fieldset
          className={downloadStyles.filters}
          aria-label="Download Filters Preview"
          hidden={!filtersOpen}
        >
          <Button size="sm" variant="secondary">
            Current
          </Button>
          <Button size="sm" variant="secondary">
            All Sources
          </Button>
          <Button size="sm" variant="secondary">
            All Stages
          </Button>
          <Button size="sm" variant="ghost">
            Clear Filters
          </Button>
        </fieldset>
      </div>
    </div>
  );
}

function QueueSpecimen({ paused }: { paused: boolean }) {
  return (
    <DataTable.Provider
      data={ROWS}
      columns={downloadsColumns}
      getRowId={(row) => row.id}
      onSelectionChange={() => undefined}
      defaultSort={{ id: "time", desc: true }}
      rowHeight={80}
      onRowClick={() => undefined}
      renderRow={(args) => <DownloadQueueRow {...args} paused={paused} />}
    >
      <div className={styles.queue}>
        <DataTable.Root variant="list" />
      </div>
    </DataTable.Provider>
  );
}

function SelectionActions() {
  return (
    <div className={selectionStyles.tiles}>
      <button type="button" className={selectionStyles.tile}>
        <IconRefreshFill18 />
        <span>Retry</span>
      </button>
      <button type="button" className={selectionStyles.tile} data-danger="">
        <IconMediaPauseFill18 />
        <span>Cancel</span>
      </button>
      <div className={selectionStyles.separator} />
      <button type="button" className={selectionStyles.tile}>
        <IconCircleXmarkFill18 />
        <span>Clear</span>
      </button>
    </div>
  );
}

export function DownloadsLab({ onExit }: { onExit: () => void }) {
  const [paused, setPaused] = useState(false);
  return (
    <Tooltip.Provider>
      <div className={styles.root}>
        <header className={styles.header}>
          <Button size="sm" variant="ghost" rounding="rounded" onClick={onExit}>
            <IconChevronLeftOutline12 />
            Library
          </Button>
          <div className={styles.identity}>
            <Logo size={16} />
            <span>Downloads Lab</span>
            <span className={styles.badge}>{SECTIONS.length}</span>
          </div>
          <span className={styles.headerNote}>Local fixtures only</span>
        </header>
        <div className={styles.body}>
          <aside className={styles.sidebar}>
            <p>Edit the production styles and see every download state here.</p>
            <nav aria-label="Downloads specimens">
              {SECTIONS.map(([id, label]) => (
                <a key={id} href={`#${id}`}>
                  {label}
                </a>
              ))}
            </nav>
            <code>components/library/downloads/page/styles.module.css</code>
          </aside>
          <main className={styles.main} data-scroll-viewport>
            <div className={styles.content}>
              <div className={styles.intro}>
                <span>Development workshop</span>
                <h1>Download components</h1>
                <p>
                  Production components rendered with fixed local data. Use the
                  checkboxes to inspect selected rows and the pause control to
                  preview the paused queue.
                </p>
              </div>
              <Specimen
                id="chrome"
                title="Toolbar and filters"
                path="downloads/page/styles.module.css"
              >
                <ToolbarSpecimen paused={paused} onPausedChange={setPaused} />
              </Specimen>
              <Specimen
                id="queue"
                title="Queue rows"
                path="downloads/page/columns.tsx"
              >
                <QueueSpecimen paused={paused} />
              </Specimen>
              <Specimen
                id="empty"
                title="Empty states"
                path="library/empty/index.tsx"
              >
                <div className={styles.emptyGrid}>
                  <div className={downloadStyles.empty}>
                    <DownloadsEmpty />
                  </div>
                  <div className={downloadStyles.empty}>
                    <MatchesEmpty />
                  </div>
                </div>
              </Specimen>
              <Specimen
                id="feedback"
                title="Feedback states"
                path="downloads/page/styles.module.css"
              >
                <div className={styles.feedbackGrid}>
                  <div className={downloadStyles.message} role="status">
                    Loading download history
                  </div>
                  <div className={downloadStyles.message} role="alert">
                    Couldn’t load download history.
                    <Button size="sm" variant="secondary">
                      Try Again
                    </Button>
                  </div>
                  <div className={downloadStyles.more}>
                    <Button size="sm" variant="secondary">
                      Load More
                    </Button>
                  </div>
                </div>
              </Specimen>
              <Specimen
                id="selection"
                title="Selection actions"
                path="dock/selection/styles.module.css"
              >
                <div className={styles.centeredStage}>
                  <SelectionActions />
                </div>
              </Specimen>
              <Specimen
                id="badges"
                title="Card badges"
                path="save/card/media/downloading-badge/styles.module.css"
              >
                <div className={styles.badgeGrid}>
                  <div className={styles.mediaMock}>
                    <DownloadingBadge save={BADGE_SAVE} isDownloading />
                    <span>Downloading</span>
                  </div>
                  <div className={styles.mediaMock}>
                    <DownloadingBadge
                      save={FAILED_BADGE_SAVE}
                      isDownloading={false}
                    />
                    <span>Failed</span>
                  </div>
                </div>
              </Specimen>
            </div>
          </main>
        </div>
      </div>
    </Tooltip.Provider>
  );
}
