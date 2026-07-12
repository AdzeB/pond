import {
  IconArrowUpRightOutline18 as ArrowUpRight,
  IconChevronDownOutline18 as ChevronDown,
  IconChevronRightOutline18 as ChevronRight,
  IconClockOutline18 as Clock,
  IconMagnifierOutline18 as Magnifier,
} from "@pond/icons/outline/18";
import { type Prefs, SOURCES, type Source } from "@pond/schema/db";
import { Button, Dialog } from "@pond/ui";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  cardModel,
  describeRun,
  formatClock,
} from "@/components/library-sync-monitor/lib/helpers";
import { buildAccountMenu } from "@/components/library-sync-monitor/lib/source-menu";
import { BrandTile } from "@/components/library-sync-monitor-source-tile";
import { type AccountRow, useAccounts } from "@/hooks/use-accounts";
import { useSyncHistory } from "@/hooks/use-sync-history";
import {
  useWatches,
  WATCH_NEEDS_SESSION,
  WATCHABLE,
  type WatchRow,
  watchKindLabel,
} from "@/hooks/use-watches";
import { sourceSettingsFor } from "@/lib/save/source-settings";
import { getSourceDef } from "@/lib/save/sources-registry";
import { showContextMenu } from "@/lib/ui/native-menu";
import { formatNumber } from "@/lib/util/format";
import { usePrefs } from "@/stores/prefs";
import {
  type SyncAccountStatus,
  syncMonitor,
  useSyncByAccount,
} from "@/stores/sync-monitor";
import { setSearchInput } from "@/stores/view-store";
import styles from "./styles.module.css";

// Connectable platforms; `local` / `web` aren't sources you sign in to.
const SYNCABLE: readonly Source[] = SOURCES.filter(
  (s) => s !== "local" && s !== "web",
);

// Wallet-card backgrounds: each platform's brand hue, dark enough for white
// text in both themes (same palette as the design prototypes).
const _WALLET_HUES: Partial<Record<Source, string>> = {
  twitter: "oklch(0.22 0.01 250)",
  instagram: "oklch(0.6 0.21 350)",
  pinterest: "oklch(0.5 0.19 25)",
  arena: "oklch(0.27 0.01 250)",
  cosmos: "oklch(0.35 0.05 290)",
  tiktok: "oklch(0.22 0.02 250)",
  youtube: "oklch(0.55 0.21 25)",
  reddit: "oklch(0.58 0.17 40)",
  threads: "oklch(0.22 0.01 250)",
};

const _FALLBACK_HUE = "oklch(0.4 0.03 250)";

// The global background-sync cadence, surfaced per-account (it applies to all).
const FREQUENCY_OPTIONS = [
  { hours: 1, label: "Every hour" },
  { hours: 2, label: "Every 2 hours" },
  { hours: 6, label: "Every 6 hours" },
  { hours: 12, label: "Every 12 hours" },
  { hours: 24, label: "Once a day" },
] as const;

// "Instagram · @work" — the account's display name for menus and the banner.
function accountName(account: AccountRow): string {
  const suffix = account.label ?? (account.handle ? `@${account.handle}` : "");
  const label = getSourceDef(account.source).label;
  return suffix ? `${label} · ${suffix}` : label;
}

// The watch's display name for menus, dialogs, and confirms.
function watchName(watch: WatchRow): string {
  if (watch.label) return watch.label;
  // Playlist/list ids are opaque tokens, not handles — no @ prefix.
  return watch.kind === "playlist" || watch.kind === "list"
    ? watch.handle
    : `@${watch.handle}`;
}

// One-line answer to "is everything okay?" for the page header.
function healthLine(
  accounts: readonly AccountRow[],
  watches: readonly WatchRow[],
  byAccount: Record<string, SyncAccountStatus>,
): string {
  if (accounts.length === 0 && watches.length === 0) {
    return "Nothing connected yet — add a source to start collecting.";
  }
  const sources = new Set(accounts.map((a) => a.source));
  const all = [...accounts, ...watches];
  const running = all.filter(
    (a) => byAccount[a.id]?.state === "running",
  ).length;
  const broken = all.filter((a) => {
    const tone = cardModel(byAccount[a.id]).tone;
    return tone === "err" || tone === "paused";
  }).length;
  const parts = [
    `${accounts.length} account${accounts.length === 1 ? "" : "s"}`,
    ...(watches.length > 0
      ? [`watching ${watches.length}`]
      : [`${sources.size} source${sources.size === 1 ? "" : "s"}`]),
    broken > 0
      ? `${broken} need${broken === 1 ? "s" : ""} attention`
      : running > 0
        ? `syncing ${running}`
        : "all healthy",
  ];
  return parts.join(" · ");
}

// The Sources page, Family-wallet style: one colored card per signed-in
// account in a 3-up grid, a per-account dialog for settings, and dialogs for
// the connect and watch flows.
export function SourcesPage() {
  const { accounts, refetch } = useAccounts();
  const { watches, refetch: refetchWatches } = useWatches();
  const byAccount = useSyncByAccount();
  // The connect and watch flows are dialogs over the page.
  const [connectOpen, setConnectOpen] = useState(false);
  const [watchOpen, setWatchOpen] = useState(false);
  // Platform we've sent to the browser for sign-in; polled until an account
  // for it connects (new id, or an existing one flipping to connected).
  const [waiting, setWaiting] = useState<Source | null>(null);
  // Snapshot of connected account ids at the time connect started, so we can
  // tell a fresh/re-authed account apart from ones that were already healthy.
  const [connectedBefore, setConnectedBefore] = useState<Set<string>>(
    () => new Set(),
  );
  // Account whose settings dialog is open.
  const [detailId, setDetailId] = useState<string | null>(null);
  // Watch whose settings dialog is open.
  const [watchDetailId, setWatchDetailId] = useState<string | null>(null);

  // While waiting for the browser sign-in, poll the registry until the
  // extension delivers the session, then kick that account's first sync.
  useEffect(() => {
    if (!waiting) return;
    const source = waiting;
    let cancelled = false;
    const timer = setInterval(() => {
      void (async () => {
        try {
          const rows = await refetch();
          if (cancelled) return;
          const arrived = rows.find(
            (a) =>
              a.source === source && a.connected && !connectedBefore.has(a.id),
          );
          if (!arrived) return;
          syncMonitor.seed(arrived.id, source, { connected: true });
          void window.pond.syncRunNow(arrived.id);
          setWaiting(null);
          setConnectOpen(false);
          setDetailId(arrived.id);
        } catch {
          /* keep polling */
        }
      })();
    }, 1500);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [waiting, connectedBefore, refetch]);

  const startConnect = (source: Source) => {
    setConnectedBefore(
      new Set(accounts.filter((a) => a.connected).map((a) => a.id)),
    );
    void window.pond.connectSource(source);
    setWaiting(source);
  };

  const detailAccount = detailId
    ? (accounts.find((a) => a.id === detailId) ?? null)
    : null;
  const detailWatch = watchDetailId
    ? (watches.find((w) => w.id === watchDetailId) ?? null)
    : null;

  // First account that needs a human: session expired or repeated failure.
  const broken = accounts.find((a) => {
    const tone = cardModel(byAccount[a.id]).tone;
    return tone === "err" || tone === "paused";
  });
  const brokenModel = broken ? cardModel(byAccount[broken.id]) : null;

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <header className={styles.header}>
          <div className={styles["header-text"]}>
            <h1 className={styles.title}>Sources</h1>
            <p className={styles.subline}>
              {healthLine(accounts, watches, byAccount)}
            </p>
          </div>
          <span className={styles["header-actions"]}>
            {accounts.length > 0 ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => void window.pond.syncRunAll()}
              >
                Sync all
              </Button>
            ) : null}
            <Button
              variant="primary"
              size="sm"
              onClick={() => setConnectOpen(true)}
            >
              ＋ Connect
            </Button>
          </span>
        </header>

        {broken && brokenModel ? (
          <div className={styles.banner}>
            <span className={styles["banner-text"]}>
              <span className={styles["banner-title"]}>
                {accountName(broken)} needs attention
              </span>
              <span className={styles["banner-sub"]}>
                {brokenModel.tone === "paused"
                  ? "Session expired — sign back into that account to resume syncing."
                  : "Last sync failed — retry, or open the account for details."}
              </span>
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                if (brokenModel.tone === "paused") {
                  void window.pond.connectSource(broken.source);
                } else {
                  void window.pond.syncRunNow(broken.id);
                }
              }}
            >
              {brokenModel.tone === "paused" ? "Reconnect" : "Retry"}
            </Button>
          </div>
        ) : null}

        {accounts.length > 0 ? (
          <div className={styles.wallets}>
            {accounts.map((account) => (
              <WalletCard
                key={account.id}
                account={account}
                status={byAccount[account.id]}
                onOpen={() => setDetailId(account.id)}
              />
            ))}
          </div>
        ) : (
          <div className={styles.empty}>
            <p className={styles["empty-title"]}>Nothing connected yet</p>
            <p className={styles["empty-sub"]}>
              Connect a source — sign in once and Pond keeps your saves syncing
              in the background.
            </p>
          </div>
        )}

        <div className={styles["sec-label"]}>
          Watching
          <span
            className={styles["sec-info"]}
            title="Public accounts you follow — their new posts flow into your library. Read-only, no sign-in."
          >
            ⓘ
          </span>
          <button
            type="button"
            className={styles["sec-add"]}
            aria-label="Watch an account"
            onClick={() => setWatchOpen(true)}
          >
            ＋
          </button>
        </div>
        {watches.length > 0 ? (
          <div className={styles["watch-strip"]}>
            {watches.map((watch) => (
              <WatchCard
                key={watch.id}
                watch={watch}
                status={byAccount[watch.id]}
                onOpen={() => setWatchDetailId(watch.id)}
              />
            ))}
          </div>
        ) : (
          <p className={styles["quiet-line"]}>
            Follow a public account — new posts land in your library on their
            own.
          </p>
        )}
      </div>

      {detailAccount ? (
        <AccountDialog
          account={detailAccount}
          status={byAccount[detailAccount.id]}
          onClose={() => setDetailId(null)}
          onChanged={() => void refetch()}
        />
      ) : null}

      {detailWatch ? (
        <WatchDialog
          watch={detailWatch}
          accounts={accounts}
          status={byAccount[detailWatch.id]}
          onClose={() => setWatchDetailId(null)}
          onChanged={() => void refetchWatches()}
        />
      ) : null}

      {connectOpen ? (
        <ConnectDialog
          accounts={accounts}
          waiting={waiting}
          onClose={() => {
            setWaiting(null);
            setConnectOpen(false);
          }}
          onPick={startConnect}
          onCancelWait={() => setWaiting(null)}
        />
      ) : null}

      {watchOpen ? (
        <WatchAddDialog
          accounts={accounts}
          onClose={() => setWatchOpen(false)}
          onAdded={(watchId) => {
            void refetchWatches();
            setWatchOpen(false);
            setWatchDetailId(watchId);
          }}
        />
      ) : null}
    </div>
  );
}

// ── wallet card ──────────────────────────────────────────────────────────────

// Brand tile with the profile picture stacked onto it. The overlap gap is a
// transparent notch masked out of the tile (not a border), so the card color
// shows through. A broken/expired CDN URL drops the avatar and the notch
// together rather than leaving a bite out of the tile.
function WalletMark({
  source,
  avatarUrl,
}: {
  source: Source;
  avatarUrl: string | null | undefined;
}) {
  const [broken, setBroken] = useState(false);
  const showAvatar = Boolean(avatarUrl) && !broken;
  return (
    <span className={styles["wallet-mark"]}>
      <span
        className={styles["wallet-mark-tile"]}
        data-notched={showAvatar || undefined}
      >
        <BrandTile source={source} size={30} />
      </span>
      {showAvatar ? (
        <img
          className={styles["wallet-avatar"]}
          src={avatarUrl ?? undefined}
          alt=""
          referrerPolicy="no-referrer"
          onError={() => setBroken(true)}
        />
      ) : null}
    </span>
  );
}

function WalletCard({
  account,
  status,
  onOpen,
}: {
  account: AccountRow;
  status: SyncAccountStatus | undefined;
  onOpen: () => void;
}) {
  const model = cardModel(status);
  const count = account.sync?.knownCount ?? 0;
  const def = getSourceDef(account.source);

  const sub =
    model.tone === "run"
      ? model.statusText
      : model.tone === "paused"
        ? "Session expired"
        : model.tone === "err"
          ? "Sync failed"
          : [
              account.handle ? `@${account.handle}` : null,
              `${formatNumber(count)} item${count === 1 ? "" : "s"}`,
            ]
              .filter(Boolean)
              .join(" · ");

  // The card is a div with a full-bleed hit-area button underneath, so the
  // Reconnect chip can be a real button without nesting interactives.
  return (
    <div className={styles.wallet}>
      <button
        type="button"
        className={styles["wallet-hit"]}
        aria-label={accountName(account)}
        onClick={onOpen}
        onContextMenu={(e) => {
          e.preventDefault();
          void showContextMenu(buildAccountMenu(account, model, onOpen));
        }}
      />
      <span className={styles["wallet-top"]}>
        <WalletMark source={account.source} avatarUrl={account.avatarUrl} />
        {model.tone === "run" ? (
          <span className={styles["wallet-spinner"]} />
        ) : model.tone === "err" || model.tone === "paused" ? (
          <button
            type="button"
            className={styles["wallet-chip"]}
            onClick={() => {
              if (model.tone === "paused") {
                void window.pond.connectSource(account.source);
              } else {
                void window.pond.syncRunNow(account.id);
              }
            }}
          >
            {model.tone === "paused" ? "Reconnect" : "Retry"}
          </button>
        ) : null}
      </span>
      <span className={styles["wallet-name"]}>
        {account.label ?? def.label}
      </span>
      <span className={styles["wallet-sub"]}>{sub}</span>
    </div>
  );
}

// ── watch card ───────────────────────────────────────────────────────────────

function WatchCard({
  watch,
  status,
  onOpen,
}: {
  watch: WatchRow;
  status: SyncAccountStatus | undefined;
  onOpen: () => void;
}) {
  const model = cardModel(status);
  const count = watch.sync?.knownCount ?? 0;
  const def = getSourceDef(watch.source);

  // The name line already carries the handle (unless nicknamed), so the sub
  // leads with the platform and what kind of thing is being watched.
  const platformLine = watch.label
    ? watchName({ ...watch, label: null })
    : watch.kind && watch.kind !== "user"
      ? `${def.label} ${watchKindLabel(watch.kind)}`
      : def.label;
  const sub =
    model.tone === "run"
      ? model.statusText
      : model.tone === "paused"
        ? "Needs an account"
        : model.tone === "err"
          ? "Check failed"
          : `${platformLine} · ${formatNumber(count)} item${count === 1 ? "" : "s"}`;

  const openMenu = () => {
    void showContextMenu([
      model.tone === "run"
        ? {
            label: "Cancel check",
            onSelect: () => void window.pond.syncCancel(watch.id),
          }
        : {
            label: "Check now",
            onSelect: () => void window.pond.syncRunNow(watch.id),
          },
      { type: "separator" },
      { label: "Open settings", onSelect: onOpen },
    ]);
  };

  // Family-style tile: big circular face (pfp when resolved, brand mark
  // otherwise), name and status beneath. A running check draws a spinning
  // ring around the face; problems tint the sub-line.
  return (
    <button
      type="button"
      className={styles["watch-tile"]}
      onClick={onOpen}
      onContextMenu={(e) => {
        e.preventDefault();
        openMenu();
      }}
    >
      <span
        className={styles["watch-face"]}
        data-running={model.tone === "run" || undefined}
      >
        {watch.avatarUrl ? (
          <>
            <img
              className={styles["watch-pfp"]}
              src={watch.avatarUrl}
              alt=""
              referrerPolicy="no-referrer"
              onError={(e) => {
                e.currentTarget.hidden = true;
              }}
            />
            <span className={styles["watch-badge"]}>
              <BrandTile source={watch.source} size={16} />
            </span>
          </>
        ) : (
          <BrandTile source={watch.source} size={52} />
        )}
      </span>
      <span className={styles["watch-name"]}>{watchName(watch)}</span>
      <span
        className={styles["watch-sub"]}
        data-tone={
          model.tone === "err" || model.tone === "paused" ? "warn" : undefined
        }
      >
        {sub}
      </span>
    </button>
  );
}

// ── per-account dialog ───────────────────────────────────────────────────────

function AccountDialog({
  account,
  status,
  onClose,
  onChanged,
}: {
  account: AccountRow;
  status: SyncAccountStatus | undefined;
  onClose: () => void;
  onChanged: () => void;
}) {
  const navigate = useNavigate();
  const model = cardModel(status);
  const { source } = account;
  const { runs } = useSyncHistory(source, 1, account.id);
  const last = runs[0];
  const [confirming, setConfirming] = useState(false);
  const [removing, setRemoving] = useState(false);
  const nickRef = useRef<HTMLInputElement>(null);
  const handleRef = useRef<HTMLInputElement>(null);

  const [sync, patchSync] = usePrefs("sync");
  const [preferences, patchPreferences] = usePrefs("preferences");
  const count = account.sync?.knownCount ?? 0;
  const def = getSourceDef(source);

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

  const saveNickname = async () => {
    const raw = nickRef.current?.value.trim() ?? "";
    const next = raw.length > 0 ? raw : null;
    if (next === account.label) return;
    await window.pond.query("accounts.setLabel", {
      accountId: account.id,
      label: next,
    });
    onChanged();
  };

  const saveHandle = async () => {
    const raw = handleRef.current?.value.trim().replace(/^@/, "") ?? "";
    const next = raw.length > 0 ? raw : null;
    if (next === account.handle) return;
    await window.pond.query("accounts.setHandle", {
      accountId: account.id,
      handle: next,
    });
    onChanged();
  };

  const viewItems = () => {
    setSearchInput(
      [{ field: "account", operator: "eq", value: account.id }],
      "",
    );
    onClose();
    void navigate({ to: "/" });
  };

  const disconnect = async () => {
    setRemoving(true);
    try {
      await window.pond.query("accounts.disconnect", {
        accountId: account.id,
      });
      onChanged();
      setConfirming(false);
      onClose();
    } finally {
      setRemoving(false);
    }
  };

  const openMore = () => {
    void showContextMenu([
      {
        label: "Backfill",
        enabled: model.connected && model.tone !== "run",
        onSelect: () =>
          void window.pond.syncRunNow(account.id, { forceFull: true }),
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

  const primary = (() => {
    switch (model.tone) {
      case "run":
        return {
          label: "Cancel sync",
          run: () => window.pond.syncCancel(account.id),
        };
      case "paused":
        return {
          label: "Reconnect",
          run: () => window.pond.connectSource(source),
        };
      case "err":
        return {
          label: "Retry now",
          run: () => window.pond.syncRunNow(account.id),
        };
      default:
        return model.connected
          ? {
              label: "Sync Now",
              run: () => window.pond.syncRunNow(account.id),
            }
          : { label: "Connect", run: () => window.pond.connectSource(source) };
    }
  })();

  return (
    <>
      <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
        <Dialog.Portal>
          <Dialog.Backdrop />
          <Dialog.Popup className={styles["account-dialog"]}>
            <div className={styles["dialog-hero"]}>
              <BrandTile source={source} size={52} />
              <Dialog.Title className={styles["dialog-name"]}>
                {account.label ?? def.label}
              </Dialog.Title>
              <span className={styles["dialog-sub"]}>
                {account.handle ? `@${account.handle} · ` : ""}
                {formatNumber(count)} item{count === 1 ? "" : "s"}
                {status?.lastSyncedAt ? ` · synced ${model.lastText}` : ""}
              </span>
            </div>

            <div className={styles.rows}>
              <div className={styles["setting-row"]}>
                <span className={styles["field-text"]}>
                  <span className={styles["field-label"]}>Nickname</span>
                </span>
                <input
                  ref={nickRef}
                  className={styles["nick-input"]}
                  placeholder="None"
                  defaultValue={account.label ?? ""}
                  onBlur={() => void saveNickname()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") e.currentTarget.blur();
                  }}
                />
              </div>

              <div className={styles["setting-row"]}>
                <span className={styles["field-text"]}>
                  <span className={styles["field-label"]}>Handle</span>
                  <span className={styles["field-hint"]}>
                    Your username — unlocks the profile picture
                  </span>
                </span>
                <input
                  ref={handleRef}
                  className={styles["nick-input"]}
                  placeholder="@username"
                  defaultValue={account.handle ? `@${account.handle}` : ""}
                  onBlur={() => void saveHandle()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") e.currentTarget.blur();
                  }}
                />
              </div>

              <button
                type="button"
                className={`${styles["setting-row"]} ${styles["setting-row-button"]}`}
                onClick={openFrequencyMenu}
              >
                <span className={styles["field-text"]}>
                  <span className={styles["field-label"]}>Sync frequency</span>
                  <span className={styles["field-hint"]}>
                    Applies to all accounts
                  </span>
                </span>
                <span className={styles.select}>
                  {frequencyLabel}
                  <ChevronDown width={12} height={12} />
                </span>
              </button>

              {sourceSettingsFor(source).map((field) => (
                <div className={styles["setting-row"]} key={field.key}>
                  <span className={styles["field-text"]}>
                    <span className={styles["field-label"]}>{field.label}</span>
                  </span>
                  <span className={styles.segmented}>
                    {field.options.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        data-on={
                          preferences[field.key] === option.value || undefined
                        }
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

              <div className={styles["setting-row"]}>
                <span className={styles["field-text"]}>
                  <span className={styles["field-label"]}>Session</span>
                </span>
                <span
                  className={styles["session-value"]}
                  data-tone={model.tone}
                >
                  ●{" "}
                  {model.connected
                    ? model.tone === "paused"
                      ? "Sign-in required"
                      : "Healthy"
                    : "Not connected"}
                </span>
              </div>

              {last ? (
                <div className={styles["setting-row"]}>
                  <span className={styles["field-text"]}>
                    <span className={styles["field-label"]}>Last run</span>
                    <span className={styles["field-hint"]}>
                      {describeRun(last)}
                    </span>
                  </span>
                  <span className={styles["field-value"]}>
                    <Clock width={12} height={12} /> {formatClock(last.ts)}
                  </span>
                </div>
              ) : null}

              <button
                type="button"
                className={`${styles["setting-row"]} ${styles["setting-row-button"]}`}
                onClick={viewItems}
              >
                <span className={styles["field-text"]}>
                  <span className={styles["field-label"]}>
                    View items in library
                  </span>
                </span>
                <ChevronRight width={13} height={13} />
              </button>
            </div>

            <div className={styles["dialog-foot"]}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirming(true)}
              >
                Disconnect…
              </Button>
              <Button variant="ghost" size="sm" onClick={openMore}>
                More…
              </Button>
              <span className={styles["dialog-foot-end"]}>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    void primary.run();
                    if (model.tone !== "run") onClose();
                  }}
                >
                  {primary.label}
                </Button>
              </span>
            </div>

            {model.tone === "err" && status?.lastError ? (
              <p className={styles["error-line"]}>{status.lastError}</p>
            ) : null}
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={`Disconnect ${accountName(account)}?`}
        description={`Pond signs this account out and stops its syncing. The ${formatNumber(count)} item${count === 1 ? "" : "s"} already saved stay in your library.`}
        confirmLabel="Disconnect"
        busy={removing}
        onConfirm={() => void disconnect()}
      />
    </>
  );
}

// ── per-watch dialog ─────────────────────────────────────────────────────────

function WatchDialog({
  watch,
  accounts,
  status,
  onClose,
  onChanged,
}: {
  watch: WatchRow;
  accounts: readonly AccountRow[];
  status: SyncAccountStatus | undefined;
  onClose: () => void;
  onChanged: () => void;
}) {
  const navigate = useNavigate();
  const model = cardModel(status);
  const { source } = watch;
  const { runs } = useSyncHistory(source, 1, watch.id);
  const last = runs[0];
  const [confirming, setConfirming] = useState(false);
  const [removing, setRemoving] = useState(false);
  const nickRef = useRef<HTMLInputElement>(null);

  const [sync, patchSync] = usePrefs("sync");
  const count = watch.sync?.knownCount ?? 0;
  const def = getSourceDef(source);

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

  const saveNickname = async () => {
    const raw = nickRef.current?.value.trim() ?? "";
    const next = raw.length > 0 ? raw : null;
    if (next === watch.label) return;
    await window.pond.query("watches.setLabel", {
      watchId: watch.id,
      label: next,
    });
    onChanged();
  };

  const viewItems = () => {
    setSearchInput([{ field: "account", operator: "eq", value: watch.id }], "");
    onClose();
    void navigate({ to: "/" });
  };

  const stopWatching = async () => {
    setRemoving(true);
    try {
      await window.pond.query("watches.remove", { watchId: watch.id });
      onChanged();
      setConfirming(false);
      onClose();
    } finally {
      setRemoving(false);
    }
  };

  // What the check rides on: public listing, or a connected account's session.
  const viaAccount = watch.via
    ? (accounts.find((a) => a.id === watch.via) ?? null)
    : null;
  const accessText = WATCH_NEEDS_SESSION.includes(source)
    ? viaAccount
      ? `Via ${viaAccount.handle ? `@${viaAccount.handle}` : accountName(viaAccount)}`
      : "Needs a connected account"
    : "Public";

  return (
    <>
      <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
        <Dialog.Portal>
          <Dialog.Backdrop />
          <Dialog.Popup className={styles["account-dialog"]}>
            <div className={styles["dialog-hero"]}>
              <span className={styles.wavatar}>
                <BrandTile source={source} size={52} />
              </span>
              <Dialog.Title className={styles["dialog-name"]}>
                {watchName(watch)}
              </Dialog.Title>
              <span className={styles["dialog-sub"]}>
                Watching{" "}
                {watch.kind && watch.kind !== "user"
                  ? `a ${def.label} ${watchKindLabel(watch.kind)}`
                  : `on ${def.label}`}{" "}
                · {formatNumber(count)} item
                {count === 1 ? "" : "s"}
                {status?.lastSyncedAt ? ` · checked ${model.lastText}` : ""}
              </span>
            </div>

            <div className={styles.rows}>
              <div className={styles["setting-row"]}>
                <span className={styles["field-text"]}>
                  <span className={styles["field-label"]}>Nickname</span>
                </span>
                <input
                  ref={nickRef}
                  className={styles["nick-input"]}
                  placeholder="None"
                  defaultValue={watch.label ?? ""}
                  onBlur={() => void saveNickname()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") e.currentTarget.blur();
                  }}
                />
              </div>

              <div className={styles["setting-row"]}>
                <span className={styles["field-text"]}>
                  <span className={styles["field-label"]}>Access</span>
                  <span className={styles["field-hint"]}>
                    Read-only — Pond never posts or follows
                  </span>
                </span>
                <span className={styles["field-value"]}>{accessText}</span>
              </div>

              <button
                type="button"
                className={`${styles["setting-row"]} ${styles["setting-row-button"]}`}
                onClick={openFrequencyMenu}
              >
                <span className={styles["field-text"]}>
                  <span className={styles["field-label"]}>Check frequency</span>
                  <span className={styles["field-hint"]}>
                    Applies to all accounts
                  </span>
                </span>
                <span className={styles.select}>
                  {frequencyLabel}
                  <ChevronDown width={12} height={12} />
                </span>
              </button>

              {last ? (
                <div className={styles["setting-row"]}>
                  <span className={styles["field-text"]}>
                    <span className={styles["field-label"]}>Last check</span>
                    <span className={styles["field-hint"]}>
                      {describeRun(last)}
                    </span>
                  </span>
                  <span className={styles["field-value"]}>
                    <Clock width={12} height={12} /> {formatClock(last.ts)}
                  </span>
                </div>
              ) : null}

              <button
                type="button"
                className={`${styles["setting-row"]} ${styles["setting-row-button"]}`}
                onClick={viewItems}
              >
                <span className={styles["field-text"]}>
                  <span className={styles["field-label"]}>
                    View items in library
                  </span>
                </span>
                <ChevronRight width={13} height={13} />
              </button>
            </div>

            <div className={styles["dialog-foot"]}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirming(true)}
              >
                Stop Watching…
              </Button>
              <span className={styles["dialog-foot-end"]}>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    if (model.tone === "run") {
                      void window.pond.syncCancel(watch.id);
                    } else {
                      void window.pond.syncRunNow(watch.id);
                      onClose();
                    }
                  }}
                >
                  {model.tone === "run" ? "Cancel check" : "Check Now"}
                </Button>
              </span>
            </div>

            {model.tone === "err" && status?.lastError ? (
              <p className={styles["error-line"]}>{status.lastError}</p>
            ) : null}
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={`Stop watching ${watchName(watch)}?`}
        description={`Pond stops checking for new posts. The ${formatNumber(count)} item${count === 1 ? "" : "s"} already saved stay in your library.`}
        confirmLabel="Stop Watching"
        busy={removing}
        onConfirm={() => void stopWatching()}
      />
    </>
  );
}

// ── connect flow (dialog) ────────────────────────────────────────────────────

function ConnectDialog({
  accounts,
  waiting,
  onClose,
  onPick,
  onCancelWait,
}: {
  accounts: readonly AccountRow[];
  waiting: Source | null;
  onClose: () => void;
  onPick: (source: Source) => void;
  onCancelWait: () => void;
}) {
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  // Search is the whole step; focus it whenever the grid is showing.
  useEffect(() => {
    if (!waiting) searchRef.current?.focus();
  }, [waiting]);

  const q = query.trim().toLowerCase();
  const matches = SYNCABLE.filter((source) => {
    if (!q) return true;
    const def = getSourceDef(source);
    return (
      def.label.toLowerCase().includes(q) ||
      source.includes(q) ||
      accounts.some(
        (a) =>
          a.source === source &&
          ((a.handle ?? "").toLowerCase().includes(q) ||
            (a.label ?? "").toLowerCase().includes(q)),
      )
    );
  });

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop />
        <Dialog.Popup className={styles["flow-dialog"]}>
          {waiting ? (
            <div className={styles["wait-hero"]}>
              <span className={styles["wait-ring"]}>
                <BrandTile source={waiting} size={44} />
              </span>
              <Dialog.Title className={styles["wait-title"]}>
                Sign in to {getSourceDef(waiting).label}
              </Dialog.Title>
              <p className={styles["wait-sub"]}>
                We opened {getSourceDef(waiting).label} in your browser. Sign in
                as usual, then push the session with the Pond extension — this
                updates on its own.
              </p>
              <span className={styles["wait-actions"]}>
                <Button variant="ghost" size="sm" onClick={onCancelWait}>
                  Back
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => void window.pond.connectSource(waiting)}
                >
                  <ArrowUpRight width={14} height={14} />
                  Reopen in browser
                </Button>
              </span>
            </div>
          ) : (
            <>
              <Dialog.Title className={styles["flow-dialog-title"]}>
                Connect a Source
              </Dialog.Title>
              <div className={styles.search}>
                <Magnifier width={15} height={15} />
                <input
                  ref={searchRef}
                  type="search"
                  placeholder="Search sources…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>

              {matches.length > 0 ? (
                <div className={styles.pick}>
                  {matches.map((source) => (
                    <button
                      key={source}
                      type="button"
                      className={styles["pick-tile"]}
                      onClick={() => onPick(source)}
                    >
                      <BrandTile source={source} size={54} />
                      <span className={styles["pick-name"]}>
                        {getSourceDef(source).label}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className={styles["quiet-line"]}>
                  No source found — try a different name.
                </p>
              )}
              <p className={styles["quiet-line"]}>
                Sign in once — Pond syncs your saves from then on.
              </p>
            </>
          )}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ── watch flow (dialog) ──────────────────────────────────────────────────────

// Mirror of the main-process WatchTarget (watches.resolve result).
interface WatchTargetChip {
  kind: WatchRow["kind"];
  handle: string;
  display: string;
}

// Per-source explainer for the handle step: what "watching" rides on and
// what kinds of links it understands.
function watchHint(source: Source, viaHandle: string | null): string {
  switch (source) {
    case "arena":
      return "A channel, profile, or group — paste a link or type a slug. Public, no sign-in.";
    case "youtube":
      return "A channel handle like @mkbhd, or paste a channel, tab, or playlist link.";
    case "tiktok":
      return "A public profile handle — no sign-in.";
    case "pinterest":
      return "A profile or board — paste a link or type user or user/board. Public, no sign-in.";
    case "cosmos":
      return "A profile or cluster — paste a link or type user or user/cluster. Public, no sign-in.";
    case "twitter":
      return viaHandle
        ? `A profile or list link — checks through your @${viaHandle} session, the account never knows.`
        : "Connect a Twitter account first — watching here rides your own session.";
    default:
      return viaHandle
        ? `Checks through your @${viaHandle} session — the account never knows.`
        : `Connect a ${getSourceDef(source).label} account first — watching here rides your own session.`;
  }
}

function WatchAddDialog({
  accounts,
  onClose,
  onAdded,
}: {
  accounts: readonly AccountRow[];
  onClose: () => void;
  onAdded: (watchId: string) => void;
}) {
  // Two steps: pick a source, then type a handle or paste a link.
  const [source, setSource] = useState<Source | null>(null);
  const [handle, setHandle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resolved, setResolved] = useState<WatchTargetChip | null>(null);
  const handleRef = useRef<HTMLInputElement>(null);

  // Live "what did we understand?" chip: resolve the input (URL parse, and an
  // API probe for bare Are.na slugs) shortly after typing stops.
  useEffect(() => {
    const input = handle.trim();
    if (!source || !input) {
      setResolved(null);
      return;
    }
    let stale = false;
    const timer = setTimeout(async () => {
      try {
        const res = (await window.pond.query("watches.resolve", {
          source,
          input,
        })) as { ok: boolean; target?: WatchTargetChip };
        if (!stale) setResolved(res.ok ? (res.target ?? null) : null);
      } catch {
        if (!stale) setResolved(null);
      }
    }, 350);
    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [source, handle]);

  // Back inside the dialog steps from the handle step to the picker;
  // Esc / backdrop close the dialog itself (standard dialog behavior).
  const back = () => {
    if (source) {
      setSource(null);
      setHandle("");
      setError(null);
    } else {
      onClose();
    }
  };

  useEffect(() => {
    if (source) handleRef.current?.focus();
  }, [source]);

  const viaAccount = source
    ? (accounts.find((a) => a.source === source) ?? null)
    : null;
  const needsAccount = source
    ? WATCH_NEEDS_SESSION.includes(source) && !viaAccount
    : false;
  const canStart =
    source !== null && handle.trim().length > 0 && !needsAccount && !busy;

  const start = async () => {
    if (!source || !canStart) return;
    setBusy(true);
    setError(null);
    try {
      const res = (await window.pond.query("watches.add", {
        source,
        handle: handle.trim(),
      })) as { ok: boolean; reason?: string; watch?: { id: string } };
      if (res.ok && res.watch) {
        onAdded(res.watch.id);
        return;
      }
      setError(
        res.reason === "already_watching"
          ? "You're already watching this."
          : res.reason === "needs_account"
            ? `Connect a ${getSourceDef(source).label} account first.`
            : res.reason === "invalid"
              ? "Couldn't recognise that handle or link."
              : "Couldn't start watching — try again.",
      );
    } catch {
      setError("Couldn't start watching — try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop />
        <Dialog.Popup className={styles["flow-dialog"]}>
          {source ? (
            <div className={styles["wait-hero"]}>
              <span className={styles.wavatar}>
                <BrandTile source={source} size={44} />
              </span>
              <Dialog.Title className={styles["wait-title"]}>
                Who do you want to watch?
              </Dialog.Title>
              <p className={styles["wait-sub"]}>
                {watchHint(source, viaAccount?.handle ?? null)}
              </p>
              <div className={styles["handle-field"]}>
                {/* The @ prefix only makes sense for bare handles, not links. */}
                {!/[:./]/.test(handle) ? (
                  <span className={styles["handle-at"]}>@</span>
                ) : null}
                <input
                  ref={handleRef}
                  type="text"
                  placeholder="handle or link"
                  value={handle}
                  disabled={needsAccount}
                  onChange={(e) => {
                    setHandle(e.target.value);
                    setError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void start();
                  }}
                />
              </div>
              {error ? (
                <p className={styles["error-line"]}>{error}</p>
              ) : resolved ? (
                <p className={styles["resolve-chip"]}>
                  {getSourceDef(source).label} {watchKindLabel(resolved.kind)} ·{" "}
                  {resolved.display}
                </p>
              ) : null}
              <span className={styles["wait-actions"]}>
                <Button variant="ghost" size="sm" onClick={back}>
                  Back
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={!canStart}
                  onClick={() => void start()}
                >
                  {busy ? "Starting…" : "Start Watching"}
                </Button>
              </span>
            </div>
          ) : (
            <>
              <Dialog.Title className={styles["flow-dialog-title"]}>
                Watch an Account
              </Dialog.Title>
              <div className={styles.pick}>
                {WATCHABLE.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={styles["pick-tile"]}
                    onClick={() => setSource(s)}
                  >
                    <BrandTile source={s} size={54} />
                    <span className={styles["pick-name"]}>
                      {getSourceDef(s).label}
                    </span>
                  </button>
                ))}
              </div>
              <p className={styles["quiet-line"]}>
                Follow someone's public posts — read-only, nothing is posted or
                followed on your behalf.
              </p>
            </>
          )}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
