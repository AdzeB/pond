import type { Source, SourceVisibility } from "@pond/schema/db";
import { Button, Dialog } from "@pond/ui";
import { useSyncHistory } from "@/hooks/use-sync-history";
import { getSourceDef } from "@/lib/sources-registry";
import { usePrefs } from "@/stores/prefs";
import type { SyncSourceStatus } from "@/stores/sync-monitor";
import {
  cardModel,
  describeRun,
  formatClock,
  formatRunDuration,
  runTone,
  type SyncRun,
} from "./helpers";
import { BrandTile } from "./source-tile";
import styles from "./styles.module.css";

const VISIBILITY: { id: SourceVisibility; label: string }[] = [
  { id: "always", label: "Always" },
  { id: "when-count", label: "When it has saves" },
  { id: "hidden", label: "Hidden" },
];

export function SourceDialog({
  source,
  status,
  open,
  onOpenChange,
  onOpenRun,
}: {
  source: Source | null;
  status: SyncSourceStatus | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenRun: (run: SyncRun) => void;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop />
        {open && source ? (
          <SourceBody source={source} status={status} onOpenRun={onOpenRun} />
        ) : null}
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function SourceBody({
  source,
  status,
  onOpenRun,
}: {
  source: Source;
  status: SyncSourceStatus | undefined;
  onOpenRun: (run: SyncRun) => void;
}) {
  const def = getSourceDef(source);
  const model = cardModel(status);
  const { runs } = useSyncHistory(source, 4);
  const last = runs[0];

  const [sidebar, patchSidebar] = usePrefs("sidebar");
  const [preferences, patchPreferences] = usePrefs("preferences");
  const [sync] = usePrefs("sync");

  const entry = sidebar.sources?.find((s) => s.source === source);
  const visibility: SourceVisibility = entry?.visibility ?? "when-count";
  const handle = sync.handles?.[source];

  const setVisibility = (next: SourceVisibility) => {
    const sources = (sidebar.sources ?? []).map((s) =>
      s.source === source ? { ...s, visibility: next } : s,
    );
    patchSidebar({ sources });
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
          ? { label: "Sync now", run: () => window.pond.syncRunNow(source) }
          : { label: "Connect", run: () => window.pond.connectSource(source) };
    }
  })();

  return (
    <Dialog.Popup className={styles.dlgPopup}>
      <div className={styles.dlgHead}>
        <span className={styles.ring}>
          <BrandTile source={source} size={44} />
          <span className={`${styles.dot} ${styles[model.tone]}`} aria-hidden />
        </span>
        <div className={styles.dh}>
          <Dialog.Title className={styles.dn}>{def.label}</Dialog.Title>
          <div className={`${styles.ds} ${styles.st} ${styles[model.tone]}`}>
            {model.statusText}
          </div>
        </div>
        <Dialog.Close
          render={<Button icon size="sm" variant="ghost" aria-label="Close" />}
        >
          ✕
        </Dialog.Close>
      </div>

      <div className={styles.dlgActions}>
        <Button variant="primary" onClick={() => void primary.run()}>
          {primary.label}
        </Button>
      </div>

      <div className={styles.dlgBody}>
        {last ? (
          <div className={styles.dsec}>
            <div className={styles.dt}>Last run</div>
            <div className={styles.statgrid}>
              <Stat label="Seen" value={last.harvest?.seen ?? 0} />
              <Stat label="New" value={last.harvest?.fresh ?? 0} />
              <Stat
                label="Queued"
                value={last.enqueue?.succeeded ?? 0}
                tone="ok"
              />
              <Stat
                label="Failed"
                value={last.enqueue?.failed ?? 0}
                tone={last.enqueue?.failed ? undefined : "zero"}
              />
            </div>
          </div>
        ) : null}

        {runs.length > 0 ? (
          <div className={styles.dsec}>
            <div className={styles.dt}>Recent runs</div>
            {runs.map((run) => {
              const tone = runTone(run);
              const dd =
                tone === "ok"
                  ? styles.ok
                  : tone === "err"
                    ? styles.err
                    : tone === "warn"
                      ? styles.warn
                      : styles.idle;
              return (
                <button
                  key={run.id}
                  type="button"
                  className={styles.drow}
                  onClick={() => onOpenRun(run)}
                >
                  <span className={`${styles.dd} ${dd}`} />
                  <span className={styles.dl}>
                    {describeRun(run)}{" "}
                    <span className={styles.dim}>· {run.trigger}</span>
                  </span>
                  <span className={styles.rt}>
                    {formatClock(run.ts)} · {formatRunDuration(run.durationMs)}
                  </span>
                  <span className={styles.dchev}>›</span>
                </button>
              );
            })}
          </div>
        ) : null}

        <div className={styles.dsec}>
          <div className={styles.dt}>Connection</div>
          <div className={styles.field}>
            <div>
              <div className={styles.fl}>Account</div>
              <div className={styles.fh}>Used to read your saved list.</div>
            </div>
            {handle ? (
              <span className={styles.handle}>@{handle}</span>
            ) : (
              <span className={styles.handle}>not linked</span>
            )}
          </div>
          <div className={styles.field}>
            <div>
              <div className={styles.fl}>Session</div>
              <div className={styles.fh}>
                Re-authenticate if syncs start failing.
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void window.pond.connectSource(source)}
            >
              Reconnect
            </Button>
          </div>
        </div>

        <div className={styles.dsec}>
          <div className={styles.dt}>Settings</div>
          <div className={styles.field}>
            <div>
              <div className={styles.fl}>
                Auto-sync <span className={styles.propose}>PROPOSED</span>
              </div>
              <div className={styles.fh}>
                Not in the data model yet — syncs are manual today.
              </div>
            </div>
            <select disabled defaultValue="manual">
              <option value="manual">Manual only</option>
            </select>
          </div>
          {model.connected ? (
            <>
              <div className={styles.field}>
                <div>
                  <div className={styles.fl}>Backfill</div>
                  <div className={styles.fh}>
                    Re-scan your entire saved list for anything missed, not just
                    new items.
                  </div>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={model.tone === "run"}
                  onClick={() =>
                    void window.pond.syncRunNow(source, { forceFull: true })
                  }
                >
                  Backfill
                </Button>
              </div>
              <div className={styles.field}>
                <div>
                  <div className={styles.fl}>Refresh metadata</div>
                  <div className={styles.fh}>
                    Re-fetch titles, descriptions, and any covers still missing
                    for saves you already have.
                  </div>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    void window.pond.refreshBackfillStart({ source })
                  }
                >
                  Refresh
                </Button>
              </div>
              <div className={styles.field}>
                <div>
                  <div className={styles.fl}>Re-download at full quality</div>
                  <div className={styles.fh}>
                    Discard existing covers and re-download them at full
                    resolution. Slower, but replaces any low-res media.
                  </div>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    void window.pond.refreshBackfillStart({
                      source,
                      overwrite: true,
                    })
                  }
                >
                  Re-download
                </Button>
              </div>
            </>
          ) : null}
          <div className={styles.field}>
            <div>
              <div className={styles.fl}>Show in sidebar</div>
              <div className={styles.fh}>
                When this source appears in the library nav.
              </div>
            </div>
            <span className={styles.segm}>
              {VISIBILITY.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  className={visibility === v.id ? styles.on : undefined}
                  onClick={() => setVisibility(v.id)}
                >
                  {v.label}
                </button>
              ))}
            </span>
          </div>
          {source === "twitter" ? (
            <div className={styles.field}>
              <div>
                <div className={styles.fl}>Tweet cover</div>
                <div className={styles.fh}>Image used as the card cover.</div>
              </div>
              <span className={styles.segm}>
                {(["media", "screenshot"] as const).map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={
                      preferences.tweetCover === c ? styles.on : undefined
                    }
                    onClick={() => patchPreferences({ tweetCover: c })}
                  >
                    {c === "media" ? "Media" : "Screenshot"}
                  </button>
                ))}
              </span>
            </div>
          ) : null}
        </div>
      </div>
    </Dialog.Popup>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "ok" | "zero";
}) {
  return (
    <div className={styles.sb}>
      <div className={styles.sl}>{label}</div>
      <div
        className={`${styles.sv} ${tone === "ok" ? styles.ok : tone === "zero" ? styles.zero : ""}`}
      >
        {value}
      </div>
    </div>
  );
}
