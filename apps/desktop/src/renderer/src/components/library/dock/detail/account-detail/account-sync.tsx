import {
  IconClockFill18 as Clock,
  IconClockRotateClockwiseFill18 as History,
  IconKeyFill18 as Key,
} from "@pond/icons/fill/18";
import { IconChevronRightOutline12 as ChevronRight } from "@pond/icons/outline/12";
import { Button, TrayCard } from "@pond/ui";
import { openFrequencyPage } from "@/components/library/dock/detail/frequency";
import { useDock } from "@/components/library/dock/lib/context";
import {
  cardModel,
  describeRun,
  formatClock,
} from "@/components/library/sources/sync-monitor/lib/helpers";
import { type AccountRow, useAccounts } from "@/hooks/use-accounts";
import { useSyncHistory } from "@/hooks/use-sync-history";
import { useDetailAccountId } from "@/stores/source-detail";
import { useSyncByAccount } from "@/stores/sync-monitor";
import { useFrequencyRow } from "../frequency-row";
import styles from "./styles.module.css";

export function AccountSyncSection() {
  const { accounts } = useAccounts();
  const accountId = useDetailAccountId();
  const account = accounts.find((row) => row.id === accountId) ?? accounts[0];

  if (!account) return <TrayCard.Close />;
  return <AccountSync account={account} />;
}

function AccountSync({ account }: { account: AccountRow }) {
  const dock = useDock();
  const byAccount = useSyncByAccount();
  const frequency = useFrequencyRow();
  const { runs } = useSyncHistory(account.source, 1, account.id);

  const model = cardModel(byAccount[account.id]);
  const last = runs[0];

  return (
    <>
      <TrayCard.Header>
        <TrayCard.Back onClick={() => dock.openViewMenu("account-detail")} />
        <TrayCard.Title position="center">Sync Details</TrayCard.Title>
        <TrayCard.Separator />
        <TrayCard.Description>
          Review this account’s connection and sync schedule.
        </TrayCard.Description>
      </TrayCard.Header>
      <div className={styles.rows}>
        <Button
          variant="ghost"
          size="xl"
          width="full"
          className={styles.row}
          data-button=""
          title="Applies to all accounts"
          onClick={() => openFrequencyPage("account-sync")}
        >
          <span className={styles.icon}>
            <Clock size={18} />
          </span>
          <span className={styles.label}>Sync Frequency</span>
          <span className={styles.value}>
            {frequency.label}
            <ChevronRight />
          </span>
        </Button>
        <div className={styles.row}>
          <span className={styles.icon}>
            <Key size={18} />
          </span>
          <span className={styles.label}>Session</span>
          <span className={styles.value} data-tone={model.tone}>
            {model.connected
              ? model.tone === "paused"
                ? "Sign-in required"
                : "Healthy"
              : "Not connected"}
          </span>
        </div>
        {last ? (
          <div className={styles.row} title={describeRun(last)}>
            <span className={styles.icon}>
              <History size={18} />
            </span>
            <span className={styles.label}>Last Run</span>
            <span className={styles.value}>{formatClock(last.ts)}</span>
          </div>
        ) : null}
      </div>
    </>
  );
}
