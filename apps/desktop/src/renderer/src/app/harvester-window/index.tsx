import {
  IconArrowDiagonalInOutline18,
  IconArrowLeftOutline18,
  IconArrowRightOutline18,
  IconCircleWarningOutline18,
  IconClockRotateClockwiseOutline18,
  IconEyeOutline18,
  IconFolderOpenOutline18,
  IconUserOutline18,
  IconWindowDownloadOutline18,
} from "@pond/icons/outline/18";
import { isSource } from "@pond/schema/sources";
import { Button, cssVars, Dialog, Sidebar, Tooltip, Window } from "@pond/ui";
import type { HarvesterWindowLocation } from "@shared/harvester-window-contracts";
import { type QueueSummary, QueueSummarySchema } from "@shared/queue-contracts";
import { HotkeysProvider } from "@tanstack/react-hotkeys";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from "@tanstack/react-query";
import { MotionConfig } from "motion/react";
import {
  lazy,
  type ReactNode,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { DownloadsPage } from "@/features/downloads/components/page";
import { useLiveDownloadHydration } from "@/features/downloads/hooks/use-live-download-hydration";
import {
  projectLiveDownloads,
  type StatusFilter,
  statusBucket,
} from "@/features/downloads/lib/status-feed";
import {
  downloadsFilters,
  useDownloadsFilters,
} from "@/features/downloads/state/downloads-filters";
import { SidebarToggle } from "@/features/library/components/sidebar-toggle";
import {
  AGENT_WIDTH_DEFAULT,
  AGENT_WIDTH_MAX,
  AGENT_WIDTH_MIN,
  libraryChrome,
  useAgentWidth,
  useInspectorMode,
  useInspectorSaveId,
  useRightPane,
} from "@/features/library/state/library-chrome";
import { useSaves } from "@/features/saves/hooks/use-saves";
import { ThemeApplier } from "@/features/settings/effects/theme-applier";
import { SourceFlowHost } from "@/features/sources/components/flow";
import { FoldersPage } from "@/features/sources/components/folders";
import { NewSourceMenu } from "@/features/sources/components/new-menu";
import { SourcesPage } from "@/features/sources/components/page";
import { SyncStatusBridge } from "@/features/sources/effects/sync-status-bridge";
import { useAccounts } from "@/features/sources/hooks/use-accounts";
import { useWatchedFolder } from "@/features/sources/hooks/use-watched-folder";
import { useWatches } from "@/features/sources/hooks/use-watches";
import { startConnect, startWatch } from "@/features/sources/lib/create";
import { sourceDetail } from "@/features/sources/state/source-detail";
import { sourceNewMenu } from "@/features/sources/state/source-new-menu";
import { useWatchAdded } from "@/features/sources/state/watch-flow";
import { useWatchedFolderRevision } from "@/features/sources/state/watched-folder-flow";
import { ToastHost } from "@/shared/components/toast-host";
import styles from "./styles.module.css";

type SourceScope = "account" | "watch" | "folder";
type QueueScope = "active" | "waiting" | "failed";
type HarvesterNav =
  | { pile: "sources"; scope: SourceScope }
  | { pile: "downloads"; scope: QueueScope | null };

let appliedIntentNonce = 0;
let appliedLocationKey = "";

const SourceInspector = lazy(async () => {
  const module = await import("@/features/sources/components/inspector");
  return { default: module.SourceInspector };
});

const DownloadInspector = lazy(async () => {
  const module = await import("@/features/downloads/components/inspector");
  return { default: module.DownloadInspector };
});

function locationKey(next: HarvesterWindowLocation): string {
  return `${next.section ?? ""}:${next.intentNonce ?? 0}`;
}

function queueScope(statuses: ReadonlySet<StatusFilter>): QueueScope | null {
  if (statuses.size !== 1) return null;
  const [only] = statuses;
  if (only === "active" || only === "waiting" || only === "failed") return only;
  return null;
}

function navForLocation(
  next: HarvesterWindowLocation,
  freshIntent: boolean,
): HarvesterNav {
  const intent = freshIntent ? next.intent : undefined;
  if (intent?.type === "watch" || intent?.type === "inspect-watch") {
    return { pile: "sources", scope: "watch" };
  }
  if (
    intent?.type === "connect" ||
    intent?.type === "new-source" ||
    intent?.type === "inspect-account"
  ) {
    return { pile: "sources", scope: "account" };
  }
  if (next.section === "downloads") return { pile: "downloads", scope: null };
  return { pile: "sources", scope: "account" };
}

interface QueueCounts {
  active: number;
  waiting: number;
  failed: number;
}

function summaryQueueCounts(summary: QueueSummary | undefined): QueueCounts {
  return {
    active: summary?.running ?? 0,
    waiting: (summary?.waiting ?? 0) + (summary?.parked ?? 0),
    failed: (summary?.failed ?? 0) + (summary?.dead ?? 0),
  };
}

function applyIntent(intent: HarvesterWindowLocation["intent"]): void {
  if (!intent) return;
  if (intent.type === "new-source") {
    sourceNewMenu.open();
    return;
  }
  if (intent.type === "connect" && isSource(intent.source)) {
    void startConnect(intent.source);
    return;
  }
  if (intent.type === "watch" && isSource(intent.source)) {
    startWatch(intent.source);
    return;
  }
  if (intent.type === "inspect-account") sourceDetail.openAccount(intent.id);
  if (intent.type === "inspect-watch") sourceDetail.openWatch(intent.id);
}

export function HarvesterWindow() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 5 * 60 * 1000, refetchOnWindowFocus: false },
        },
      }),
  );
  return (
    <MotionConfig reducedMotion="user">
      <HotkeysProvider>
        <QueryClientProvider client={queryClient}>
          <Tooltip.Provider>
            <ThemeApplier />
            <SyncStatusBridge />
            <HarvesterShell />
            <SourceFlowHost />
            <Dialog.Host />
            <ToastHost />
          </Tooltip.Provider>
        </QueryClientProvider>
      </HotkeysProvider>
    </MotionConfig>
  );
}

function sameNav(left: HarvesterNav, right: HarvesterNav): boolean {
  return left.pile === right.pile && left.scope === right.scope;
}

function crumbLabel(nav: HarvesterNav): string {
  if (nav.pile === "sources") {
    if (nav.scope === "watch") return "Watches";
    if (nav.scope === "folder") return "Folders";
    return "Accounts";
  }
  if (nav.scope === "active") return "Active";
  if (nav.scope === "waiting") return "Waiting";
  if (nav.scope === "failed") return "Failed";
  return "Downloads";
}

function crumbTrail(
  nav: HarvesterNav,
): Array<{ label: string; target: HarvesterNav }> {
  if (nav.pile === "sources") {
    return [
      { label: "Sources", target: { pile: "sources", scope: "account" } },
      { label: crumbLabel(nav), target: nav },
    ];
  }
  const parent: HarvesterNav = { pile: "downloads", scope: null };
  if (!nav.scope) return [{ label: "Downloads", target: parent }];
  return [
    { label: "Downloads", target: parent },
    { label: crumbLabel(nav), target: nav },
  ];
}

function NavItem({
  current,
  count,
  label,
  onSelect,
  children,
}: {
  current: boolean;
  count: number;
  label: string;
  onSelect: () => void;
  children: ReactNode;
}) {
  return (
    <Sidebar.Item
      aria-current={current ? "page" : undefined}
      data-status={current ? "active" : undefined}
      onClick={onSelect}
    >
      <Sidebar.Icon>{children}</Sidebar.Icon>
      <Sidebar.ItemLabel>{label}</Sidebar.ItemLabel>
      <Sidebar.Count>{count}</Sidebar.Count>
    </Sidebar.Item>
  );
}

function HarvesterShell() {
  const [nav, setNav] = useState<HarvesterNav>({
    pile: "sources",
    scope: "account",
  });
  const trail = useRef<HarvesterNav[]>([{ pile: "sources", scope: "account" }]);
  const indexRef = useRef(0);
  const presentRef = useRef<(next: HarvesterNav) => void>(() => {});
  const rememberRef = useRef<(next: HarvesterNav) => void>(() => {});
  const visitRef = useRef<(next: HarvesterNav) => void>(() => {});
  const { accounts } = useAccounts();
  const { watches } = useWatches();
  const watchedFolder = useWatchedFolder();
  const folderRevision = useWatchedFolderRevision();
  const saves = useSaves();
  const downloadFilters = useDownloadsFilters();
  const addedWatchId = useWatchAdded();
  useLiveDownloadHydration();
  const queueSummary = useQuery({
    queryKey: ["queue.summary"],
    queryFn: async () =>
      QueueSummarySchema.parse(await window.pond.query("queue.summary", {})),
    refetchInterval: 2_000,
  });
  const liveCounts = useMemo(() => {
    const counts = { active: 0, waiting: 0, failed: 0 };
    for (const row of projectLiveDownloads(saves)) {
      const bucket = statusBucket(row.status);
      if (bucket === "active" || bucket === "waiting" || bucket === "failed") {
        counts[bucket] += 1;
      }
    }
    return counts;
  }, [saves]);
  const queueCounts =
    saves.length > 0 ? liveCounts : summaryQueueCounts(queueSummary.data);

  useEffect(() => {
    const api = window.pond;
    if (!api?.harvesterReady || !api.onHarvesterLocation) return;
    let navigated = false;
    const apply = (next: HarvesterWindowLocation) => {
      const nonce = next.intentNonce ?? 0;
      const freshIntent = Boolean(next.intent) && nonce !== appliedIntentNonce;
      const key = locationKey(next);
      if (key !== appliedLocationKey) {
        appliedLocationKey = key;
        const nextNav = navForLocation(next, freshIntent);
        presentRef.current(nextNav);
        rememberRef.current(nextNav);
      }
      if (!freshIntent || !next.intent) return;
      appliedIntentNonce = nonce;
      applyIntent(next.intent);
      void api.harvesterAck?.(nonce);
    };
    const stop = api.onHarvesterLocation((next) => {
      navigated = true;
      apply(next);
    });
    void api.harvesterReady().then((next) => {
      if (!navigated) apply(next);
    });
    return () => stop();
  }, []);

  useEffect(() => {
    if (!addedWatchId) return;
    visitRef.current({ pile: "sources", scope: "watch" });
  }, [addedWatchId]);

  useEffect(() => {
    if (folderRevision === 0) return;
    visitRef.current({ pile: "sources", scope: "folder" });
  }, [folderRevision]);

  useEffect(() => {
    setNav((current) => {
      if (current.pile !== "downloads") return current;
      const scope = queueScope(downloadFilters.statuses);
      if (current.scope === scope) return current;
      return { pile: "downloads", scope };
    });
  }, [downloadFilters.statuses]);

  const [index, setIndex] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(220);
  const inspectorWidth = useAgentWidth();
  const inspectorMode = useInspectorMode();
  const inspectorSaveId = useInspectorSaveId();
  const inspectorOpen = useRightPane() === "inspector";
  const inspectorVisible =
    inspectorOpen &&
    (inspectorMode === "source" ||
      (inspectorMode === "download" && inspectorSaveId != null));
  const crumbs = crumbTrail(nav);

  function commitIndex(nextIndex: number) {
    indexRef.current = nextIndex;
    setIndex(nextIndex);
  }

  function present(next: HarvesterNav) {
    if (next.pile === "downloads") {
      downloadsFilters.setStatuses(
        next.scope ? new Set([next.scope]) : new Set(),
      );
    }
    setNav(next);
  }

  function remember(next: HarvesterNav) {
    const base = trail.current.slice(0, indexRef.current + 1);
    const last = base[base.length - 1];
    if (last && sameNav(last, next)) return;
    trail.current = [...base, next];
    commitIndex(trail.current.length - 1);
  }

  function visit(next: HarvesterNav) {
    libraryChrome.dismissInspector();
    present(next);
    remember(next);
  }

  function travel(delta: -1 | 1) {
    const nextIndex = indexRef.current + delta;
    const next = trail.current[nextIndex];
    if (!next) return;
    commitIndex(nextIndex);
    present(next);
  }

  presentRef.current = present;
  rememberRef.current = remember;
  visitRef.current = visit;

  return (
    <Window.Root
      className={styles.window}
      leftOpen={sidebarOpen}
      rightOpen={inspectorVisible}
      style={cssVars({
        "--window-left-track": `${sidebarWidth}px`,
        "--window-right-track": `${inspectorWidth}px`,
      })}
    >
      <Window.Top>
        <div className={styles.bar}>
          <div className={styles.chrome}>
            <SidebarToggle
              open={sidebarOpen}
              onToggle={() => setSidebarOpen((open) => !open)}
            />
            <div className={styles.history}>
              <Button
                icon
                size="sm"
                variant="ghost"
                aria-label="Back"
                disabled={index === 0}
                onClick={() => travel(-1)}
              >
                <IconArrowLeftOutline18 />
              </Button>
              <Button
                icon
                size="sm"
                variant="ghost"
                aria-label="Forward"
                disabled={index >= trail.current.length - 1}
                onClick={() => travel(1)}
              >
                <IconArrowRightOutline18 />
              </Button>
            </div>
          </div>
          <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
            <ol className={styles.trail}>
              {crumbs.map((crumb, crumbIndex) => {
                const current = crumbIndex === crumbs.length - 1;
                return (
                  <li
                    key={crumb.label}
                    className={styles.segment}
                    data-current={current || undefined}
                  >
                    {crumbIndex > 0 ? (
                      <span className={styles.separator} aria-hidden>
                        /
                      </span>
                    ) : null}
                    {current ? (
                      <span className={styles.current} aria-current="page">
                        {crumbIndex === 0 ? (
                          <CrumbMark pile={crumb.target.pile} />
                        ) : null}
                        <span className={styles.label}>{crumb.label}</span>
                      </span>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className={styles.crumb}
                        onClick={() => visit(crumb.target)}
                      >
                        {crumbIndex === 0 ? (
                          <CrumbMark pile={crumb.target.pile} />
                        ) : null}
                        <span className={styles.label}>{crumb.label}</span>
                      </Button>
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>
          <div className={styles["toolbar-end"]} />
        </div>
      </Window.Top>
      <Window.Left
        open={sidebarOpen}
        minWidth={180}
        maxWidth={420}
        defaultWidth={220}
        width={sidebarWidth}
        resizeLabel="Resize Sidebar"
        onResize={setSidebarWidth}
        onCollapse={() => setSidebarOpen(false)}
      >
        <Sidebar.Root className={styles.sidebar} width="full">
          <Sidebar.Header className={styles.brand}>
            <span className={styles["brand-label"]}>Harvester</span>
            <NewSourceMenu controlled />
          </Sidebar.Header>
          <Sidebar.Scroll className={styles.nav}>
            <Sidebar.Group>
              <Sidebar.GroupLabel>Sources</Sidebar.GroupLabel>
              <NavItem
                current={nav.pile === "sources" && nav.scope === "account"}
                count={accounts.length}
                label="Accounts"
                onSelect={() => visit({ pile: "sources", scope: "account" })}
              >
                <IconUserOutline18 />
              </NavItem>
              <NavItem
                current={nav.pile === "sources" && nav.scope === "watch"}
                count={watches.length}
                label="Watches"
                onSelect={() => visit({ pile: "sources", scope: "watch" })}
              >
                <IconEyeOutline18 />
              </NavItem>
              <NavItem
                current={nav.pile === "sources" && nav.scope === "folder"}
                count={watchedFolder.data?.path ? 1 : 0}
                label="Folders"
                onSelect={() => visit({ pile: "sources", scope: "folder" })}
              >
                <IconFolderOpenOutline18 />
              </NavItem>
            </Sidebar.Group>
            <Sidebar.Group>
              <Sidebar.GroupLabel>Downloads</Sidebar.GroupLabel>
              <NavItem
                current={nav.pile === "downloads" && nav.scope === "active"}
                count={queueCounts.active}
                label="Active"
                onSelect={() => visit({ pile: "downloads", scope: "active" })}
              >
                <IconWindowDownloadOutline18 />
              </NavItem>
              <NavItem
                current={nav.pile === "downloads" && nav.scope === "waiting"}
                count={queueCounts.waiting}
                label="Waiting"
                onSelect={() => visit({ pile: "downloads", scope: "waiting" })}
              >
                <IconClockRotateClockwiseOutline18 />
              </NavItem>
              <NavItem
                current={nav.pile === "downloads" && nav.scope === "failed"}
                count={queueCounts.failed}
                label="Failed"
                onSelect={() => visit({ pile: "downloads", scope: "failed" })}
              >
                <IconCircleWarningOutline18 />
              </NavItem>
            </Sidebar.Group>
          </Sidebar.Scroll>
        </Sidebar.Root>
      </Window.Left>
      <Window.Center>
        <div className={styles.stage}>
          <div className={styles.main}>
            {nav.pile === "downloads" ? (
              <DownloadsPage />
            ) : nav.scope === "folder" ? (
              <FoldersPage />
            ) : (
              <SourcesPage scope={nav.scope} />
            )}
          </div>
        </div>
      </Window.Center>
      <Window.Right
        open={inspectorVisible}
        minWidth={AGENT_WIDTH_MIN}
        maxWidth={AGENT_WIDTH_MAX}
        defaultWidth={AGENT_WIDTH_DEFAULT}
        width={inspectorWidth}
        resizeLabel="Resize Details"
        onResize={libraryChrome.setAgentWidth}
        onCollapse={libraryChrome.closeRightPane}
      >
        <HarvesterInspector />
      </Window.Right>
    </Window.Root>
  );
}

function CrumbMark({ pile }: { pile: HarvesterNav["pile"] }) {
  return pile === "downloads" ? (
    <IconWindowDownloadOutline18 />
  ) : (
    <IconArrowDiagonalInOutline18 />
  );
}

function HarvesterInspector() {
  const pane = useRightPane();
  const mode = useInspectorMode();
  const saveId = useInspectorSaveId();
  if (pane !== "inspector") return null;
  if (mode === "source") {
    return (
      <div className={styles.inspector}>
        <Suspense fallback={null}>
          <SourceInspector />
        </Suspense>
      </div>
    );
  }
  if (mode === "download" && saveId) {
    return (
      <div className={styles.inspector}>
        <Suspense fallback={null}>
          <DownloadInspector saveId={saveId} />
        </Suspense>
      </div>
    );
  }
  return null;
}
