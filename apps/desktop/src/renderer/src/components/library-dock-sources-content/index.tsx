import {
  IconArrowUpRightOutline18 as ArrowUpRight,
  IconChartActivity2Outline18 as Chart,
  IconChevronDownOutline18 as ChevronDown,
  IconChevronLeftOutline18 as ChevronLeft,
  IconClockOutline18 as Clock,
  IconImageOutline18 as Image,
  IconLink2Outline18 as Link,
  IconPlusOutline18 as Plus,
  IconArrowRotateClockwiseOutline18 as Rotate,
  IconXmarkOutline18 as Xmark,
} from "@pond/icons/outline/18";
import { type Prefs, SOURCES, type Source } from "@pond/schema/db";
import { useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  cardModel,
  describeRun,
  formatClock,
} from "@/components/library-sync-monitor/lib/helpers";
import { buildSourceMenu } from "@/components/library-sync-monitor/lib/source-menu";
import { BrandTile } from "@/components/library-sync-monitor-source-tile";
import { useSyncHistory } from "@/hooks/use-sync-history";
import { sourceSettingsFor } from "@/lib/save/source-settings";
import { getSourceDef } from "@/lib/save/sources-registry";
import { useMotionScaleFactor } from "@/lib/ui/motion";
import { showContextMenu } from "@/lib/ui/native-menu";
import { usePrefs } from "@/stores/prefs";
import {
  type SyncSourceStatus,
  syncMonitor,
  useSyncBySource,
} from "@/stores/sync-monitor";
import { setSearchInput } from "@/stores/view-store";
import { useDock } from "../library-dock/lib/context";
import styles from "./styles.module.css";

// Connectable accounts; `local` / `web` aren't sources you sign in to.
const SYNCABLE: readonly Source[] = SOURCES.filter(
  (s) => s !== "local" && s !== "web",
);

// The tray's internal steps: each stage is one tray of content and the pill
// morphs between their natural heights.
type Stage =
  | { kind: "list" }
  | { kind: "detail"; source: Source }
  | { kind: "picker" }
  | { kind: "wait"; source: Source }
  | { kind: "first-sync"; source: Source };

// Navigation depth per stage: moving deeper plays the scale-up pair, moving
// back plays the scale-down pair.
const DEPTH: Record<Stage["kind"], number> = {
  list: 0,
  detail: 1,
  picker: 1,
  wait: 2,
  "first-sync": 3,
};

// Stage transition (200ms): going deeper the incoming page scales 0.85 → 1
// while the outgoing scales 1 → 1.1 (zoom *through*); going back plays the
// reverse pair. The exiting page goes `position: absolute` so it stops
// contributing to layout — the card sizes to the incoming stage alone and the
// pill's size transition glides instead of jumping to max(outgoing, incoming).
// It's pinned to the card's *bottom* (the edge that stays put while the height
// morphs) so it holds the position it had in flow.
const STAGE_EASE = [0.26, 0.08, 0.25, 1] as const;

// `timeScale` stretches the durations for the playground's slow-motion mode.
const makeStageVariants = (timeScale: number) => ({
  initial: (dir: 1 | -1) => ({
    opacity: 0,
    scale: dir > 0 ? 0.85 : 1.1,
    zIndex: 2,
  }),
  animate: {
    opacity: 1,
    scale: 1,
    zIndex: 2,
    transition: { duration: 0.2 * timeScale, ease: STAGE_EASE },
  },
  exit: (dir: 1 | -1) => ({
    opacity: 0,
    scale: dir > 0 ? 1.1 : 0.85,
    zIndex: 1,
    position: "absolute" as const,
    bottom: 0,
    left: 0,
    right: 0,
    pointerEvents: "none" as const,
    transition: {
      duration: 0.2 * timeScale,
      ease: STAGE_EASE,
      delay: 0.0167 * timeScale,
    },
  }),
});

const makeReducedStageVariants = (timeScale: number) => ({
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.15 * timeScale } },
  exit: {
    opacity: 0,
    position: "absolute" as const,
    bottom: 0,
    left: 0,
    right: 0,
    pointerEvents: "none" as const,
    transition: { duration: 0.15 * timeScale },
  },
});

function isActive(status: SyncSourceStatus | undefined): boolean {
  return Boolean(status?.connected || status?.state === "running");
}

export function SourcesContent() {
  const reduceMotion = useReducedMotion();
  const bySource = useSyncBySource();
  const timeScale = useMotionScaleFactor();
  const variants = useMemo(
    () =>
      reduceMotion
        ? makeReducedStageVariants(timeScale)
        : makeStageVariants(timeScale),
    [reduceMotion, timeScale],
  );

  // `dir` is captured in state at navigation time (not derived per-render):
  // AnimatePresence's `custom` prop live-updates exiting children, and this
  // component re-renders mid-exit (pill resize, sync pushes), so a derived
  // `dir` would collapse back to 1 and flip the back-transition's zoom
  // direction while it plays.
  const [nav, setNav] = useState<{ stage: Stage; dir: 1 | -1 }>({
    stage: { kind: "list" },
    dir: 1,
  });
  const { stage, dir } = nav;
  const go = useCallback((next: Stage) => {
    setNav((prev) => ({
      stage: next,
      dir: DEPTH[next.kind] >= DEPTH[prev.stage.kind] ? 1 : -1,
    }));
  }, []);

  // One-shot snapshot per source so the list isn't blank before live pushes.
  useEffect(() => {
    let cancelled = false;
    for (const source of SYNCABLE) {
      void (async () => {
        try {
          const [status, conn] = await Promise.all([
            window.pond.syncStatus(source),
            window.pond.sourceStatus(source),
          ]);
          if (cancelled) return;
          syncMonitor.seed(source, {
            connected: conn.connected,
            lastSyncedAt: status.lastSyncedAt,
            lastError: status.lastError,
            state: status.running ? "running" : undefined,
          });
        } catch {
          /* best-effort; live pushes still update rows */
        }
      })();
    }
    return () => {
      cancelled = true;
    };
  }, []);

  // While waiting for the browser sign-in, poll until the extension delivers
  // the session, then kick the first sync and advance to the progress stage.
  useEffect(() => {
    if (stage.kind !== "wait") return;
    const source = stage.source;
    let cancelled = false;
    const timer = setInterval(() => {
      void (async () => {
        try {
          const res = await window.pond.sourceStatus(source);
          if (cancelled || !res.connected) return;
          syncMonitor.seed(source, { connected: true });
          void window.pond.syncRunNow(source);
          go({ kind: "first-sync", source });
        } catch {
          /* keep polling */
        }
      })();
    }, 1500);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [stage, go]);

  const connected = SYNCABLE.filter((s) => isActive(bySource[s]));
  const unconnected = SYNCABLE.filter((s) => !isActive(bySource[s]));

  const startConnect = (source: Source) => {
    void window.pond.connectSource(source);
    go({ kind: "wait", source });
  };

  const body =
    stage.kind === "list" ? (
      <ListStage
        connected={connected}
        unconnected={unconnected}
        bySource={bySource}
        onOpen={(source) => go({ kind: "detail", source })}
        onAdd={() => go({ kind: "picker" })}
      />
    ) : stage.kind === "detail" ? (
      <DetailStage
        source={stage.source}
        status={bySource[stage.source]}
        onBack={() => go({ kind: "list" })}
      />
    ) : stage.kind === "picker" ? (
      <PickerStage
        unconnected={unconnected}
        onBack={() => go({ kind: "list" })}
        onPick={startConnect}
      />
    ) : stage.kind === "wait" ? (
      <WaitStage
        source={stage.source}
        onBack={() => go({ kind: "picker" })}
        onReopen={() => void window.pond.connectSource(stage.source)}
      />
    ) : (
      <FirstSyncStage
        source={stage.source}
        status={bySource[stage.source]}
        onDone={() => go({ kind: "list" })}
      />
    );

  return (
    <div className={styles.card}>
      <AnimatePresence initial={false} custom={dir} propagate>
        <motion.div
          key={stage.kind}
          className={styles.stage}
          custom={dir}
          variants={variants}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          {body}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ── shared header ─────────────────────────────────────────────────────────

function TrayHeader({
  title,
  onBack,
  actions,
}: {
  title: string;
  onBack?: () => void;
  actions?: React.ReactNode;
}) {
  const dock = useDock();
  return (
    <div className={styles.header}>
      {onBack ? (
        <button
          type="button"
          className={styles["header-button"]}
          aria-label="Back"
          onClick={onBack}
        >
          <ChevronLeft width={16} height={16} />
        </button>
      ) : (
        <span className={styles["header-spacer"]} />
      )}
      <span className={styles["header-title"]}>{title}</span>
      <span className={styles["header-actions"]}>
        {actions}
        <button
          type="button"
          className={styles["header-button"]}
          aria-label="Close"
          onClick={dock.closeSources}
        >
          <Xmark width={16} height={16} />
        </button>
      </span>
    </div>
  );
}

// ── list ──────────────────────────────────────────────────────────────────

function ListStage({
  connected,
  unconnected,
  bySource,
  onOpen,
  onAdd,
}: {
  connected: readonly Source[];
  unconnected: readonly Source[];
  bySource: Partial<Record<Source, SyncSourceStatus>>;
  onOpen: (source: Source) => void;
  onAdd: () => void;
}) {
  const dock = useDock();
  const navigate = useNavigate();
  const [sync] = usePrefs("sync");

  const openAnalytics = () => {
    dock.closeSources();
    void navigate({ to: "/analytics" });
  };

  return (
    <>
      <TrayHeader
        title="Sources"
        actions={
          <>
            <button
              type="button"
              className={styles["header-button"]}
              aria-label="Analytics"
              onClick={openAnalytics}
            >
              <Chart width={16} height={16} />
            </button>
            <button
              type="button"
              className={styles["header-button"]}
              aria-label="Sync all"
              onClick={() => void window.pond.syncRunAll()}
            >
              <Rotate width={16} height={16} />
            </button>
          </>
        }
      />

      <div className={styles.list}>
        {connected.map((source) => {
          const status = bySource[source];
          const model = cardModel(status);
          const count = sync.sources?.[source]?.knownCount ?? 0;
          return (
            <button
              key={source}
              type="button"
              className={styles.row}
              onClick={() => onOpen(source)}
              onContextMenu={(e) => {
                e.preventDefault();
                void showContextMenu(buildSourceMenu(source, model, onOpen));
              }}
            >
              <BrandTile source={source} size={28} />
              <span className={styles["row-text"]}>
                <span className={styles["row-name"]}>
                  {getSourceDef(source).label}
                </span>
                <span className={styles["row-status"]} data-tone={model.tone}>
                  {model.statusText}
                  {model.tone !== "run" && status?.lastSyncedAt
                    ? ` · ${model.lastText}`
                    : ""}
                </span>
              </span>
              <span className={styles["row-end"]}>
                {count > 0 ? (
                  <span className={styles["row-count"]}>
                    {count.toLocaleString()}
                  </span>
                ) : null}
                <span className={styles.glyph} data-tone={model.tone}>
                  {model.tone === "run" ? (
                    <span className={styles.spinner} />
                  ) : model.tone === "err" || model.tone === "paused" ? (
                    "!"
                  ) : (
                    "✓"
                  )}
                </span>
              </span>
            </button>
          );
        })}
        {connected.length === 0 ? (
          <div className={styles.empty}>
            Nothing connected yet — add a source to start collecting your saves.
          </div>
        ) : null}
      </div>

      {unconnected.length > 0 ? (
        <>
          <hr className={styles.divider} />
          <button type="button" className={styles.row} onClick={onAdd}>
            <span className={styles["add-square"]}>
              <Plus width={14} height={14} />
            </span>
            <span className={styles["row-text"]}>
              <span className={styles["row-name"]}>Add a source</span>
              <span className={styles["row-status"]}>
                {unconnected
                  .slice(0, 3)
                  .map((s) => getSourceDef(s).label)
                  .join(", ")}
                {unconnected.length > 3 ? "…" : ""}
              </span>
            </span>
          </button>
        </>
      ) : null}
    </>
  );
}

// ── detail ────────────────────────────────────────────────────────────────

// The global background-sync cadence, surfaced per-source (it applies to all).
const FREQUENCY_OPTIONS = [
  { hours: 1, label: "Every hour" },
  { hours: 2, label: "Every 2 hours" },
  { hours: 6, label: "Every 6 hours" },
  { hours: 12, label: "Every 12 hours" },
  { hours: 24, label: "Once a day" },
] as const;

function DetailStage({
  source,
  status,
  onBack,
}: {
  source: Source;
  status: SyncSourceStatus | undefined;
  onBack: () => void;
}) {
  const dock = useDock();
  const navigate = useNavigate();
  const def = getSourceDef(source);
  const model = cardModel(status);
  const { runs } = useSyncHistory(source, 1);
  const last = runs[0];

  const [sync, patchSync] = usePrefs("sync");
  const [preferences, patchPreferences] = usePrefs("preferences");
  const handle = sync.handles?.[source];
  const count = sync.sources?.[source]?.knownCount ?? 0;

  const cron = sync.cron ?? { enabled: true, intervalHours: 6 };
  const frequencyLabel = cron.enabled
    ? (FREQUENCY_OPTIONS.find((o) => o.hours === cron.intervalHours)?.label ??
      `Every ${cron.intervalHours} hours`)
    : "Manual only";

  const openFrequencyMenu = () => {
    void showContextMenu([
      ...FREQUENCY_OPTIONS.map((option) => ({
        type: "checkbox" as const,
        label: option.label,
        checked: cron.enabled && cron.intervalHours === option.hours,
        onSelect: () =>
          patchSync({ cron: { enabled: true, intervalHours: option.hours } }),
      })),
      { type: "separator" as const },
      {
        type: "checkbox" as const,
        label: "Manual only",
        checked: !cron.enabled,
        onSelect: () => patchSync({ cron: { ...cron, enabled: false } }),
      },
    ]);
  };

  const viewItems = () => {
    setSearchInput([{ field: "source", operator: "eq", value: source }], "");
    dock.closeSources();
    void navigate({ to: "/" });
  };

  const primary = (() => {
    switch (model.tone) {
      case "run":
        return {
          label: "Cancel sync",
          run: () => window.pond.syncCancel(source),
        };
      case "paused":
        return {
          label: "Re-authenticate",
          run: () => window.pond.connectSource(source),
        };
      case "err":
        return {
          label: "Retry now",
          run: () => window.pond.syncRunNow(source),
        };
      default:
        return model.connected
          ? { label: "Sync Now", run: () => window.pond.syncRunNow(source) }
          : { label: "Connect", run: () => window.pond.connectSource(source) };
    }
  })();

  const openMore = () => {
    void showContextMenu([
      {
        label: "Backfill",
        enabled: model.connected && model.tone !== "run",
        onSelect: () =>
          void window.pond.syncRunNow(source, { forceFull: true }),
      },
      {
        label: "Refresh metadata",
        enabled: model.connected,
        onSelect: () => void window.pond.refreshBackfillStart({ source }),
      },
      {
        label: "Re-download at full quality",
        enabled: model.connected,
        onSelect: () =>
          void window.pond.refreshBackfillStart({ source, overwrite: true }),
      },
    ]);
  };

  const running = model.tone === "run";
  const broken = model.tone === "err" || model.tone === "paused";

  return (
    <>
      <TrayHeader title={def.label} onBack={onBack} />

      <p className={styles.desc}>
        Choose what Pond collects
        {handle ? (
          <>
            {" "}
            from <b>@{handle}</b>
          </>
        ) : null}{" "}
        and how often it checks. Everything lands in your library automatically.
      </p>

      <div className={styles["hero-card"]}>
        <div className={styles["hero-top"]}>
          <span className={styles.app}>
            <BrandTile source={source} size={30} />
          </span>
          <span
            className={styles.wire}
            data-solid={(model.connected && !broken) || undefined}
          />
          <span className={styles.node} data-tone={model.tone}>
            <span className={styles["node-glyph"]}>
              {running ? (
                <span className={styles.spinner} />
              ) : broken ? (
                "!"
              ) : (
                <Link width={14} height={14} />
              )}
            </span>
          </span>
          <span
            className={styles.wire}
            data-solid={(model.connected && !broken) || undefined}
          />
          <span className={`${styles.app} ${styles["app-pond"]}`}>◍</span>
        </div>
        <div className={styles["hero-caption"]} data-tone={model.tone}>
          {!model.connected ? (
            <>Not connected — sign in to start syncing</>
          ) : broken ? (
            model.statusText
          ) : (
            <>
              Syncing saves from <b>{def.label}</b> to <b>your pond</b>
              {count > 0 ? ` · ${count.toLocaleString()} items so far` : ""}
            </>
          )}
        </div>
      </div>

      <div className={styles.rows}>
        {last ? (
          <div className={styles["setting-row"]}>
            <span className={styles["setting-icon"]}>
              <Clock width={15} height={15} />
            </span>
            <span className={styles["field-text"]}>
              <span className={styles["field-label"]}>Last run</span>
              <span className={styles["field-hint"]}>{describeRun(last)}</span>
            </span>
            <span className={styles["field-value"]}>
              {formatClock(last.ts)}
            </span>
          </div>
        ) : null}

        <button
          type="button"
          className={`${styles["setting-row"]} ${styles["setting-row-button"]}`}
          onClick={openFrequencyMenu}
        >
          <span className={styles["setting-icon"]}>
            <Rotate width={15} height={15} />
          </span>
          <span className={styles["field-text"]}>
            <span className={styles["field-label"]}>Sync frequency</span>
            <span className={styles["field-hint"]}>Applies to all sources</span>
          </span>
          <span className={styles.select}>
            {frequencyLabel}
            <ChevronDown width={12} height={12} />
          </span>
        </button>

        {sourceSettingsFor(source).map((field) => (
          <div className={styles["setting-row"]} key={field.key}>
            <span className={styles["setting-icon"]}>
              <Image width={15} height={15} />
            </span>
            <span className={styles["field-text"]}>
              <span className={styles["field-label"]}>{field.label}</span>
              <span className={styles["field-hint"]}>{field.description}</span>
            </span>
            <span className={styles.segmented}>
              {field.options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  data-on={preferences[field.key] === option.value || undefined}
                  onClick={() =>
                    patchPreferences({
                      [field.key]: option.value,
                    } as Partial<Prefs["preferences"]>)
                  }
                >
                  {option.label}
                </button>
              ))}
            </span>
          </div>
        ))}
      </div>

      {model.connected ? (
        <div className={styles.session}>
          <span className={styles["session-dot"]} data-tone={model.tone} />
          <span className={styles["session-text"]}>
            {handle ? <b>Signed in as @{handle}</b> : <b>Signed in</b>}
            <span className={styles["cap-dim"]}>
              {model.tone === "paused"
                ? " · session expired"
                : " · session healthy"}
            </span>
          </span>
          <button
            type="button"
            className={styles["session-link"]}
            onClick={() => void window.pond.connectSource(source)}
          >
            Re-sign in
          </button>
        </div>
      ) : null}

      <div className={styles.foot}>
        <button
          type="button"
          className={styles["ghost-link"]}
          onClick={openMore}
        >
          More…
        </button>
        <span className={styles["foot-end"]}>
          {count > 0 ? (
            <button type="button" className={styles.button} onClick={viewItems}>
              View items
            </button>
          ) : null}
          <button
            type="button"
            className={`${styles.button} ${styles["button-primary"]}`}
            onClick={() => void primary.run()}
          >
            {primary.label}
          </button>
        </span>
      </div>
    </>
  );
}

// ── picker ────────────────────────────────────────────────────────────────

function PickerStage({
  unconnected,
  onBack,
  onPick,
}: {
  unconnected: readonly Source[];
  onBack: () => void;
  onPick: (source: Source) => void;
}) {
  return (
    <>
      <TrayHeader title="Add a Source" onBack={onBack} />
      <div className={styles.list}>
        {unconnected.map((source) => (
          <button
            key={source}
            type="button"
            className={styles["pick-row"]}
            onClick={() => onPick(source)}
          >
            <span className={styles["row-text"]}>
              <span className={styles["row-name"]}>
                {getSourceDef(source).label}
              </span>
              <span className={styles["row-status"]}>
                Sign in once — Pond syncs your saves from then on
              </span>
            </span>
            <BrandTile source={source} size={26} />
          </button>
        ))}
        {unconnected.length === 0 ? (
          <div className={styles.empty}>All sources connected.</div>
        ) : null}
      </div>
    </>
  );
}

// ── waiting for sign-in ───────────────────────────────────────────────────

function WaitStage({
  source,
  onBack,
  onReopen,
}: {
  source: Source;
  onBack: () => void;
  onReopen: () => void;
}) {
  const def = getSourceDef(source);
  return (
    <>
      <TrayHeader title={`Connect ${def.label}`} onBack={onBack} />
      <div className={styles.hero}>
        <span className={styles.ring}>
          <span className={styles["ring-track"]} aria-hidden />
          <span className={styles["ring-icon"]}>
            <BrandTile source={source} size={36} />
          </span>
        </span>
        <div className={styles["hero-title"]}>Sign in to {def.label}</div>
        <p className={styles["hero-sub"]}>
          We opened {def.label} in your browser. Sign in as usual — this updates
          on its own.
        </p>
      </div>
      <div className={styles.foot}>
        <button
          type="button"
          className={styles.button}
          style={{ flex: 1 }}
          onClick={onReopen}
        >
          <ArrowUpRight width={14} height={14} />
          Reopen {def.label}
        </button>
      </div>
    </>
  );
}

// ── first sync ────────────────────────────────────────────────────────────

function FirstSyncStage({
  source,
  status,
  onDone,
}: {
  source: Source;
  status: SyncSourceStatus | undefined;
  onDone: () => void;
}) {
  const def = getSourceDef(source);
  const [sync] = usePrefs("sync");
  const handle = sync.handles?.[source];
  const progress = status?.progress;
  const finished = status?.state === "done" || status?.state === "idle";
  const pct =
    progress && progress.total > 0
      ? Math.min(100, Math.round((progress.current / progress.total) * 100))
      : null;

  return (
    <>
      <TrayHeader title={`${def.label} connected`} />
      <div className={styles.hero}>
        <span className={styles["ok-ring"]}>
          <span className={styles["ring-icon"]}>
            <BrandTile source={source} size={36} />
          </span>
        </span>
        <div className={styles["hero-title"]}>
          {finished ? "First sync complete" : "First sync running"}
        </div>
        <p className={styles["hero-sub"]}>
          {handle ? (
            <>
              Signed in as <b>@{handle}</b>.{" "}
            </>
          ) : null}
          {finished
            ? "Your saves are in the library."
            : (status?.message ?? "Importing your saves, newest first.")}
        </p>
        {!finished ? (
          <div className={styles.progress}>
            <span
              className={styles["progress-fill"]}
              data-indeterminate={pct === null || undefined}
              style={pct !== null ? { width: `${pct}%` } : undefined}
            />
          </div>
        ) : null}
        {progress ? (
          <div className={styles["progress-sub"]}>
            {progress.current} of {progress.total} imported
          </div>
        ) : null}
      </div>
      <div className={styles.foot}>
        <button
          type="button"
          className={`${styles.button} ${styles["button-primary"]}`}
          style={{ flex: 1 }}
          onClick={onDone}
        >
          {finished ? "Done" : "Done — keep going in background"}
        </button>
      </div>
    </>
  );
}
