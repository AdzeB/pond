import {
  IconClockFill18 as Clock,
  IconGridFill18 as Grid,
  IconClockRotateClockwiseFill18 as History,
  IconKeyFill18 as Key,
  IconSignatureFill18 as Signature,
} from "@pond/icons/fill/18";
import { IconChevronRightOutline12 as ChevronRight } from "@pond/icons/outline/12";
import { Button, TrayCard } from "@pond/ui";
import { useRef } from "react";
import { openTrayConfirm } from "@/components/library/dock/confirm";
import { openFrequencyPage } from "@/components/library/dock/detail/frequency";
import { HeroAvatar } from "@/components/library/dock/detail/hero-avatar";
import {
  accountName,
  watchName,
} from "@/components/library/sources/page/lib/helpers";
import {
  cardModel,
  describeRun,
  formatClock,
} from "@/components/library/sources/sync-monitor/lib/helpers";
import { useAccounts } from "@/hooks/use-accounts";
import { useSyncHistory } from "@/hooks/use-sync-history";
import {
  useWatches,
  WATCH_NEEDS_SESSION,
  type WatchRow,
} from "@/hooks/use-watches";
import { getSourceDef } from "@/lib/save/sources-registry";
import { viewAccountItems } from "@/lib/ui/open-search";
import { formatNumber } from "@/lib/util/format";
import { sourceDetail, useDetailWatchId } from "@/stores/source-detail";
import { useSyncByAccount } from "@/stores/sync-monitor";
import { useFrequencyRow } from "../frequency-row";
import styles from "./styles.module.css";

export function WatchDetailSection() {
  const { watches, refetch } = useWatches();
  const watchId = useDetailWatchId();
  const watch = watches.find((w) => w.id === watchId) ?? watches[0];

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
  const { accounts } = useAccounts();
  const byAccount = useSyncByAccount();
  const status = byAccount[watch.id];
  const model = cardModel(status);
  const { source } = watch;
  const { runs } = useSyncHistory(source, 1, watch.id);
  const last = runs[0];
  const nickRef = useRef<HTMLInputElement>(null);

  const count = watch.sync?.knownCount ?? 0;
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

  const viewItems = () => viewAccountItems(watch.id);

  const confirmStopWatching = () => {
    openTrayConfirm({
      title: "Stop Watching",
      description: `Pond stops checking ${watchName(watch)} for new posts. The ${formatNumber(count)} item${count === 1 ? "" : "s"} already saved stay in your library.`,
      confirmLabel: "Stop Watching",
      returnTo: "watch-detail",
      onConfirm: async () => {
        await window.pond.query("watches.remove", { watchId: watch.id });
        onChanged();
      },
    });
  };

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
        <HeroAvatar source={source} avatarUrl={watch.avatarUrl} ring />
        <div className={styles.copy}>
          <TrayCard.Title>
            {watch.label ?? getSourceDef(source).label}
          </TrayCard.Title>
          <span className={styles.handle}>
            {watch.kind === "playlist" || watch.kind === "list"
              ? watch.handle
              : `@${watch.handle}`}
          </span>
        </div>
      </div>

      <div className={styles.rows}>
        <div className={styles.row}>
          <span className={styles.icon}>
            <Signature size={18} />
          </span>
          <span className={styles.label}>Nickname</span>
          <input
            ref={nickRef}
            className={styles.input}
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
          title="Read-only. Pond never posts or follows"
        >
          <span className={styles.icon}>
            <Key size={18} />
          </span>
          <span className={styles.label}>Access</span>
          <span className={styles.value}>{accessText}</span>
        </div>

        <Button
          variant="ghost"
          size="xl"
          width="full"
          className={styles.row}
          data-button=""
          title="Applies to all accounts"
          onClick={() => openFrequencyPage("watch-detail")}
        >
          <span className={styles.icon}>
            <Clock size={18} />
          </span>
          <span className={styles.label}>Check Frequency</span>
          <span className={styles.value}>
            {frequency.label}
            <ChevronRight />
          </span>
        </Button>

        {last ? (
          <div className={styles.row} title={describeRun(last)}>
            <span className={styles.icon}>
              <History size={18} />
            </span>
            <span className={styles.label}>Last Check</span>
            <span className={styles.value}>{formatClock(last.ts)}</span>
          </div>
        ) : null}

        <Button
          variant="ghost"
          size="xl"
          width="full"
          className={styles.row}
          data-button=""
          onClick={viewItems}
        >
          <span className={styles.icon}>
            <Grid size={18} />
          </span>
          <span className={styles.label}>View Items in Library</span>
          <span className={styles.value}>
            <ChevronRight />
          </span>
        </Button>
      </div>

      <TrayCard.Footer>
        <Button
          variant="tertiary"
          size="lg"
          style={{ width: "100%" }}
          onClick={confirmStopWatching}
        >
          Stop Watching
        </Button>
        <TrayCard.Confirm
          onClick={(e) => {
            if (model.tone === "run") {
              void window.pond.syncCancel(watch.id);
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
        <p className={styles.error}>{status.lastError}</p>
      ) : null}
    </>
  );
}
