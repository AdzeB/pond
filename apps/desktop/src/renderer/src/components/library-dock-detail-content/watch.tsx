import {
  IconClockFill18 as Clock,
  IconGridFill18 as Grid,
  IconClockRotateClockwiseFill18 as History,
  IconKeyFill18 as Key,
  IconSignatureFill18 as Signature,
} from "@pond/icons/fill/18";
import { IconChevronRightOutline18 as ChevronRight } from "@pond/icons/outline/18";
import { Button, TrayCard } from "@pond/ui";
import { useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useDock } from "@/components/library-dock/lib/context";
import { openFrequencyPage } from "@/components/library-dock-detail-content/frequency";
import {
  accountName,
  watchName,
} from "@/components/library-sources-page/lib/helpers";
import {
  cardModel,
  describeRun,
  formatClock,
} from "@/components/library-sync-monitor/lib/helpers";
import { BrandTile } from "@/components/library-sync-monitor-source-tile";
import { useAccounts } from "@/hooks/use-accounts";
import { useSyncHistory } from "@/hooks/use-sync-history";
import {
  useWatches,
  WATCH_NEEDS_SESSION,
  type WatchRow,
  watchKindLabel,
} from "@/hooks/use-watches";
import { getSourceDef } from "@/lib/save/sources-registry";
import { formatNumber } from "@/lib/util/format";
import { sourceDetail, useDetailWatchId } from "@/stores/source-detail";
import { useSyncByAccount } from "@/stores/sync-monitor";
import { setSearchInput } from "@/stores/view-store";
import { useFrequencyRow } from "./index";
import styles from "./styles.module.css";

/** Watch settings card in the dock tray; the id arrives through the source-detail store. */
export function WatchDetailSection() {
  const { watches, refetch } = useWatches();
  const watchId = useDetailWatchId();
  const watch = watches.find((w) => w.id === watchId) ?? watches[0];

  /** Nothing to show while the list loads or in playground previews without data. */
  if (!watch) return <TrayCard.Close />;
  return (
    <WatchDetail
      key={watch.id}
      watch={watch}
      onChanged={() => {
        void refetch();
        sourceDetail.changed();
      }}
    />
  );
}

function WatchDetail({
  watch,
  onChanged,
}: {
  watch: WatchRow;
  onChanged: () => void;
}) {
  const dock = useDock();
  const navigate = useNavigate();
  const { accounts } = useAccounts();
  const byAccount = useSyncByAccount();
  const status = byAccount[watch.id];
  const model = cardModel(status);
  const { source } = watch;
  const { runs } = useSyncHistory(source, 1, watch.id);
  const last = runs[0];
  const [confirming, setConfirming] = useState(false);
  const [removing, setRemoving] = useState(false);
  const nickRef = useRef<HTMLInputElement>(null);

  const count = watch.sync?.knownCount ?? 0;
  const def = getSourceDef(source);
  const frequency = useFrequencyRow();

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
    dock.closeViewMenu();
    void navigate({ to: "/" });
  };

  const stopWatching = async () => {
    setRemoving(true);
    try {
      await window.pond.query("watches.remove", { watchId: watch.id });
      onChanged();
      setConfirming(false);
      dock.closeViewMenu();
    } finally {
      setRemoving(false);
    }
  };

  /** The check rides on a public listing or a connected account's session. */
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
      <TrayCard.Close />
      <div className={styles.hero}>
        <span className={styles.wavatar}>
          <BrandTile source={source} size={52} />
        </span>
        <TrayCard.Title>{watchName(watch)}</TrayCard.Title>
        <span className={styles["hero-sub"]}>
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
        <div className={styles.row}>
          <span className={styles["row-icon"]}>
            <Signature size={18} />
          </span>
          <span className={styles["row-label"]}>Nickname</span>
          <input
            ref={nickRef}
            className={styles["row-input"]}
            placeholder="None"
            defaultValue={watch.label ?? ""}
            onBlur={() => void saveNickname()}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
            }}
          />
        </div>

        <div
          className={styles.row}
          title="Read-only — Pond never posts or follows"
        >
          <span className={styles["row-icon"]}>
            <Key size={18} />
          </span>
          <span className={styles["row-label"]}>Access</span>
          <span className={styles["row-value"]}>{accessText}</span>
        </div>

        <button
          type="button"
          className={`${styles.row} ${styles["row-button"]}`}
          title="Applies to all accounts"
          onClick={() => openFrequencyPage("watch-detail")}
        >
          <span className={styles["row-icon"]}>
            <Clock size={18} />
          </span>
          <span className={styles["row-label"]}>Check frequency</span>
          <span className={styles["row-value"]}>
            {frequency.label}
            <ChevronRight width={13} height={13} />
          </span>
        </button>

        {last ? (
          <div className={styles.row} title={describeRun(last)}>
            <span className={styles["row-icon"]}>
              <History size={18} />
            </span>
            <span className={styles["row-label"]}>Last check</span>
            <span className={styles["row-value"]}>{formatClock(last.ts)}</span>
          </div>
        ) : null}

        <button
          type="button"
          className={`${styles.row} ${styles["row-button"]}`}
          onClick={viewItems}
        >
          <span className={styles["row-icon"]}>
            <Grid size={18} />
          </span>
          <span className={styles["row-label"]}>View items in library</span>
          <span className={styles["row-value"]}>
            <ChevronRight width={13} height={13} />
          </span>
        </button>
      </div>

      <TrayCard.Footer>
        <Button
          variant="tertiary"
          size="lg"
          style={{ width: "100%" }}
          onClick={() => setConfirming(true)}
        >
          Stop Watching…
        </Button>
        <TrayCard.Confirm
          onClick={(e) => {
            if (model.tone === "run") {
              void window.pond.syncCancel(watch.id);
              /** A running check stays visible so it can be cancelled. */
              e.preventDefault();
            } else {
              void window.pond.syncRunNow(watch.id);
            }
          }}
        >
          {model.tone === "run" ? "Cancel Check" : "Check Now"}
        </TrayCard.Confirm>
      </TrayCard.Footer>

      {model.tone === "err" && status?.lastError ? (
        <p className={styles["error-line"]}>{status.lastError}</p>
      ) : null}

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
