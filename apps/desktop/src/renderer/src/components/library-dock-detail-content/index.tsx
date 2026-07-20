import {
  IconAtSignFill18 as AtSign,
  IconClockFill18 as Clock,
  IconGridFill18 as Grid,
  IconClockRotateClockwiseFill18 as History,
  IconImageFill18 as Image,
  IconKeyFill18 as Key,
  IconSignatureFill18 as Signature,
} from "@pond/icons/fill/18";
import { IconChevronRightOutline18 as ChevronRight } from "@pond/icons/outline/18";
import type { Prefs } from "@pond/schema/db";
import { Button, Menu, TrayCard } from "@pond/ui";
import { useNavigate } from "@tanstack/react-router";
import { useRef } from "react";
import { useDock } from "@/components/library-dock/lib/context";
import { openTrayConfirm } from "@/components/library-dock-confirm-content";
import { openFrequencyPage } from "@/components/library-dock-detail-content/frequency";
import { buildAccountMenu } from "@/components/library-sources-page/lib/account-menu";
import {
  accountName,
  FREQUENCY_OPTIONS,
} from "@/components/library-sources-page/lib/helpers";
import {
  cardModel,
  describeRun,
  formatClock,
} from "@/components/library-sync-monitor/lib/helpers";
import { BrandTile } from "@/components/library-sync-monitor-source-tile";
import { type AccountRow, useAccounts } from "@/hooks/use-accounts";
import { useSyncHistory } from "@/hooks/use-sync-history";
import { sourceSettingsFor } from "@/lib/save/source-settings";
import { getSourceDef } from "@/lib/save/sources-registry";
import { formatNumber } from "@/lib/util/format";
import { usePrefs } from "@/stores/prefs";
import { sourceDetail, useDetailAccountId } from "@/stores/source-detail";
import { useSyncByAccount } from "@/stores/sync-monitor";
import { setSearchInput } from "@/stores/view-store";
import styles from "./styles.module.css";

/** Shared by the account and watch detail cards. */
export function useFrequencyRow() {
  const [sync] = usePrefs("sync");
  const cron = sync.cron ?? { enabled: true, intervalHours: 6 };
  const label = cron.enabled
    ? (FREQUENCY_OPTIONS.find((o) => o.hours === cron.intervalHours)?.label ??
      `Every ${cron.intervalHours} hours`)
    : "Manual only";

  return { label };
}

/** Account settings card in the dock tray; the id arrives through the source-detail store. */
export function AccountDetailSection() {
  const { accounts, refetch } = useAccounts();
  const accountId = useDetailAccountId();
  const account = accounts.find((a) => a.id === accountId) ?? accounts[0];

  /** Nothing to show while the list loads or in playground previews without data. */
  if (!account) return <TrayCard.Close />;
  return (
    <AccountDetail
      key={account.id}
      account={account}
      onChanged={() => {
        void refetch();
        sourceDetail.changed();
      }}
    />
  );
}

function AccountDetail({
  account,
  onChanged,
}: {
  account: AccountRow;
  onChanged: () => void;
}) {
  const dock = useDock();
  const navigate = useNavigate();
  const byAccount = useSyncByAccount();
  const status = byAccount[account.id];
  const model = cardModel(status);
  const { source } = account;
  const { runs } = useSyncHistory(source, 1, account.id);
  const last = runs[0];
  const nickRef = useRef<HTMLInputElement>(null);
  const handleRef = useRef<HTMLInputElement>(null);

  const [preferences, patchPreferences] = usePrefs("preferences");
  const count = account.sync?.knownCount ?? 0;
  const def = getSourceDef(source);
  const frequency = useFrequencyRow();

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
    dock.closeViewMenu();
    void navigate({ to: "/" });
  };

  const confirmDisconnect = () => {
    openTrayConfirm({
      title: "Disconnect",
      description: `Pond signs ${accountName(account)} out and stops its syncing. The ${formatNumber(count)} item${count === 1 ? "" : "s"} already saved stay in your library.`,
      confirmLabel: "Disconnect",
      returnTo: "account-detail",
      onConfirm: async () => {
        await window.pond.query("accounts.disconnect", {
          accountId: account.id,
        });
        onChanged();
      },
    });
  };

  const primary = (() => {
    switch (model.tone) {
      case "run":
        return {
          label: "Cancel Sync",
          run: () => window.pond.syncCancel(account.id),
        };
      case "paused":
        return {
          label: "Reconnect",
          run: () => window.pond.connectSource(source),
        };
      case "err":
        return {
          label: "Retry Now",
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
      <TrayCard.Close />
      <div className={styles.hero}>
        <BrandTile source={source} size={52} />
        <TrayCard.Title>{account.label ?? def.label}</TrayCard.Title>
        <span className={styles["hero-sub"]}>
          {account.handle ? `@${account.handle} · ` : ""}
          {formatNumber(count)} item{count === 1 ? "" : "s"}
          {status?.lastSyncedAt ? ` · synced ${model.lastText}` : ""}
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
            defaultValue={account.label ?? ""}
            onBlur={() => void saveNickname()}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
            }}
          />
        </div>

        <div className={styles.row} title="Unlocks the profile picture">
          <span className={styles["row-icon"]}>
            <AtSign size={18} />
          </span>
          <span className={styles["row-label"]}>Handle</span>
          <input
            ref={handleRef}
            className={styles["row-input"]}
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
          className={`${styles.row} ${styles["row-button"]}`}
          title="Applies to all accounts"
          onClick={() => openFrequencyPage("account-detail")}
        >
          <span className={styles["row-icon"]}>
            <Clock size={18} />
          </span>
          <span className={styles["row-label"]}>Sync Frequency</span>
          <span className={styles["row-value"]}>
            {frequency.label}
            <ChevronRight width={13} height={13} />
          </span>
        </button>

        {sourceSettingsFor(source).map((field) => (
          <div className={styles.row} key={field.key} title={field.description}>
            <span className={styles["row-icon"]}>
              <Image size={18} />
            </span>
            <span className={styles["row-label"]}>{field.label}</span>
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

        <div className={styles.row}>
          <span className={styles["row-icon"]}>
            <Key size={18} />
          </span>
          <span className={styles["row-label"]}>Session</span>
          <span className={styles["row-value"]} data-tone={model.tone}>
            {model.connected
              ? model.tone === "paused"
                ? "Sign-in required"
                : "Healthy"
              : "Not connected"}
          </span>
        </div>

        {last ? (
          <div className={styles.row} title={describeRun(last)}>
            <span className={styles["row-icon"]}>
              <History size={18} />
            </span>
            <span className={styles["row-label"]}>Last Run</span>
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
          <span className={styles["row-label"]}>View Items in Library</span>
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
          onClick={confirmDisconnect}
        >
          Disconnect
        </Button>
        <Menu.Root>
          <Menu.Trigger variant="tertiary" size="lg" style={{ width: "100%" }}>
            More
          </Menu.Trigger>
          <Menu.Portal>
            <Menu.Positioner side="top" align="center">
              <Menu.Popup>
                <Menu.Items items={buildAccountMenu(account, model)} />
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
        <TrayCard.Confirm
          onClick={(e) => {
            void primary.run();
            /** A running sync stays visible so it can be cancelled. */
            if (model.tone === "run") e.preventDefault();
          }}
        >
          {primary.label}
        </TrayCard.Confirm>
      </TrayCard.Footer>

      {model.tone === "err" && status?.lastError ? (
        <p className={styles["error-line"]}>{status.lastError}</p>
      ) : null}
    </>
  );
}
