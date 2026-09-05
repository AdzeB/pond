import {
  IconClockFill18 as Clock,
  IconGear3Fill18 as Gear,
  IconGridFill18 as Grid,
  IconUserFill18 as User,
} from "@pond/icons/fill/18";
import { IconChevronRightOutline12 as ChevronRight } from "@pond/icons/outline/12";
import { Button, PageDialog } from "@pond/ui";
import { viewAccountItems } from "@/features/search/lib/open-search";
import { HeroAvatar } from "@/features/sources/components/flow/detail/hero-avatar/hero-avatar";
import { accountName } from "@/features/sources/components/page/lib/helpers";
import { cardModel } from "@/features/sources/components/sync-monitor/lib/helpers";
import {
  type AccountRow,
  useAccounts,
} from "@/features/sources/hooks/use-accounts";
import { getSourceDef } from "@/features/sources/lib/registry";
import { connectFlow } from "@/features/sources/state/connect-flow";
import {
  sourceDetail,
  useDetailAccountId,
} from "@/features/sources/state/source-detail";
import { sourceFlow } from "@/features/sources/state/source-flow";
import { useSyncByAccount } from "@/features/sources/state/sync-monitor";
import { confirm } from "@/shared/components/confirm-dialog/confirm-dialog";
import { formatNumber } from "@/shared/lib/format";
import styles from "./account-detail.module.css";

export function AccountDetailSection() {
  const { accounts, refetch } = useAccounts();
  const accountId = useDetailAccountId();
  const account = accounts.find((a) => a.id === accountId) ?? accounts[0];

  if (!account) return <AccountDetailPending />;
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

function AccountDetailPending() {
  return (
    <>
      <div className={styles.hero} data-pending />
      <div className={styles.rows}>
        <div className={styles.row} data-pending />
        <div className={styles.row} data-pending />
        <div className={styles.row} data-pending />
        <div className={styles.row} data-pending />
      </div>
      <PageDialog.Footer>
        <span className={styles["pending-action"]} />
        <span className={styles["pending-action"]} />
      </PageDialog.Footer>
    </>
  );
}

function AccountDetail({
  account,
  onChanged,
}: {
  account: AccountRow;
  onChanged: () => void;
}) {
  const { accounts } = useAccounts();
  const byAccount = useSyncByAccount();
  const status = byAccount[account.id];
  const model = cardModel(status);
  const { source } = account;

  const count = account.sync?.knownCount ?? 0;
  const def = getSourceDef(source);

  const startConnect = () => {
    connectFlow.start(
      source,
      accounts.filter((a) => a.connected).map((a) => a.id),
    );
    sourceFlow.push("connect-wait");
  };

  const viewItems = () => viewAccountItems(account.id);

  const confirmDisconnect = () => {
    confirm({
      title: "Disconnect",
      description: `Pond signs ${accountName(account)} out and stops its syncing. The ${formatNumber(count)} item${count === 1 ? "" : "s"} already saved stay in your library.`,
      confirmLabel: "Disconnect",
      onConfirm: async () => {
        await window.pond.query("accounts.disconnect", {
          accountId: account.id,
        });
        onChanged();
        sourceFlow.close();
      },
    });
  };

  const primary = (() => {
    switch (model.tone) {
      case "run":
        return {
          label: "Cancel Sync",
          run: () => window.pond.syncCancel(account.id),
          dismiss: false,
        };
      case "paused":
        return {
          label: "Reconnect",
          run: startConnect,
          dismiss: false,
        };
      case "err":
        return {
          label: "Retry Now",
          run: () => window.pond.syncRunNow(account.id),
          dismiss: true,
        };
      default:
        return model.connected
          ? {
              label: "Sync Now",
              run: () => window.pond.syncRunNow(account.id),
              dismiss: true,
            }
          : { label: "Connect", run: startConnect, dismiss: false };
    }
  })();

  return (
    <>
      <div className={styles.hero}>
        <HeroAvatar source={source} avatarUrl={account.avatarUrl} />
        <div className={styles.copy}>
          <h1 className={styles.name}>{account.label ?? def.label}</h1>
          {account.handle ? (
            <span className={styles.handle}>@{account.handle}</span>
          ) : null}
        </div>
      </div>

      <div className={styles.rows}>
        <Button
          variant="ghost"
          size="xl"
          width="full"
          className={styles.row}
          data-button=""
          onClick={() => sourceFlow.push("account-profile")}
        >
          <span className={styles.icon}>
            <User size={18} />
          </span>
          <span className={styles.label}>Profile</span>
          <span className={styles.value}>
            <ChevronRight />
          </span>
        </Button>

        <Button
          variant="ghost"
          size="xl"
          width="full"
          className={styles.row}
          data-button=""
          onClick={() => sourceFlow.push("account-sync")}
        >
          <span className={styles.icon}>
            <Clock size={18} />
          </span>
          <span className={styles.label}>Sync Details</span>
          <span className={styles.value}>
            <ChevronRight />
          </span>
        </Button>

        <Button
          variant="ghost"
          size="xl"
          width="full"
          className={styles.row}
          data-button=""
          onClick={() => sourceFlow.push("account-maintenance")}
        >
          <span className={styles.icon}>
            <Gear size={18} />
          </span>
          <span className={styles.label}>Maintenance</span>
          <span className={styles.value}>
            <ChevronRight />
          </span>
        </Button>

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

      <PageDialog.Footer>
        <Button
          variant="tertiary"
          size="md"
          width="full"
          onClick={confirmDisconnect}
        >
          Disconnect
        </Button>
        <PageDialog.Confirm
          onClick={() => {
            void primary.run();
            if (primary.dismiss) sourceFlow.close();
          }}
        >
          {primary.label}
        </PageDialog.Confirm>
      </PageDialog.Footer>

      {model.tone === "err" && status?.lastError ? (
        <p className={styles.error}>{status.lastError}</p>
      ) : null}
    </>
  );
}
