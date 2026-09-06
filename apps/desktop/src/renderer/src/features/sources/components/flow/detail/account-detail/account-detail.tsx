import { Dialog } from "@pond/ui";
import { viewAccountItems } from "@/features/search/lib/open-search";
import { cardModel } from "@/features/sources/components/sync-monitor/lib/helpers";
import {
  type AccountRow,
  useAccounts,
} from "@/features/sources/hooks/use-accounts";
import { getSourceDef } from "@/features/sources/lib/registry";
import { connectFlow } from "@/features/sources/state/connect-flow";
import { useDetailAccountId } from "@/features/sources/state/source-detail";
import { sourceFlow } from "@/features/sources/state/source-flow";
import { useSyncByAccount } from "@/features/sources/state/sync-monitor";
import styles from "../detail.module.css";
import { DetailOverview } from "../detail-overview";

export function AccountDetailSection() {
  const { accounts } = useAccounts();
  const accountId = useDetailAccountId();
  const account = accounts.find((a) => a.id === accountId) ?? accounts[0];

  if (!account) return <AccountDetailPending />;
  return <AccountDetail key={account.id} account={account} />;
}

function AccountDetailPending() {
  return (
    <>
      <div className={styles.hero} data-pending />
      <div className={styles.navigation}>
        <div className={styles.row} data-pending />
        <div className={styles.row} data-pending />
        <div className={styles.row} data-pending />
        <div className={styles.row} data-pending />
      </div>
      <Dialog.Footer className={styles.footer}>
        <span className={styles["pending-action"]} />
      </Dialog.Footer>
    </>
  );
}

function AccountDetail({ account }: { account: AccountRow }) {
  const { accounts } = useAccounts();
  const byAccount = useSyncByAccount();
  const status = byAccount[account.id];
  const model = cardModel(status);
  const { source } = account;

  const def = getSourceDef(source);

  const startConnect = () => {
    connectFlow.start(
      source,
      accounts.filter((a) => a.connected).map((a) => a.id),
    );
    sourceFlow.push("connect-wait");
  };

  const primary = (() => {
    switch (model.tone) {
      case "run":
        return {
          label: "Cancel Fetch",
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
              label: "Fetch Updates",
              run: () => window.pond.syncRunNow(account.id),
              dismiss: true,
            }
          : { label: "Connect", run: startConnect, dismiss: false };
    }
  })();

  return (
    <DetailOverview
      onViewItems={() => viewAccountItems(account.id)}
      source={source}
      avatarUrl={account.avatarUrl}
      name={account.label ?? def.label}
      handle={account.handle ? `@${account.handle}` : null}
      pages={{
        profile: "account-profile",
        maintenance: "account-maintenance",
        options: "account-options",
      }}
      error={model.tone === "err" ? status?.lastError : null}
    >
      <Dialog.Confirm
        onClick={() => {
          void primary.run();
          if (primary.dismiss) sourceFlow.close();
        }}
      >
        {primary.label}
      </Dialog.Confirm>
    </DetailOverview>
  );
}
