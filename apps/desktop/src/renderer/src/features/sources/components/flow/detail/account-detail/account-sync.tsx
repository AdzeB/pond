import {
  IconClockFill18 as Clock,
  IconClockRotateClockwiseFill18 as History,
  IconKeyFill18 as Key,
} from "@pond/icons/fill/18";
import { IconChevronRightOutline12 as ChevronRight } from "@pond/icons/outline/12";
import { Button, PageDialog } from "@pond/ui";
import { openFrequencyPage } from "@/features/sources/components/flow/detail/frequency/frequency";
import {
  cardModel,
  describeRun,
  formatClock,
} from "@/features/sources/components/sync-monitor/lib/helpers";
import {
  type AccountRow,
  useAccounts,
} from "@/features/sources/hooks/use-accounts";
import { useSyncHistory } from "@/features/sources/hooks/use-sync-history";
import { useDetailAccountId } from "@/features/sources/state/source-detail";
import { useSyncByAccount } from "@/features/sources/state/sync-monitor";
import { useFrequencyRow } from "../frequency-row";
import styles from "./account-detail.module.css";

export function AccountSyncSection() {
  const { accounts } = useAccounts();
  const accountId = useDetailAccountId();
  const account = accounts.find((row) => row.id === accountId) ?? accounts[0];

  if (!account) return null;
  return <AccountSync account={account} />;
}

function AccountSync({ account }: { account: AccountRow }) {
  const byAccount = useSyncByAccount();
  const frequency = useFrequencyRow();
  const { runs } = useSyncHistory(account.source, 1, account.id);

  const model = cardModel(byAccount[account.id]);
  const last = runs[0];

  return (
    <>
      <PageDialog.Description>
        Review this account’s connection and sync schedule.
      </PageDialog.Description>
      <div className={styles.rows}>
        <Button
          variant="ghost"
          size="xl"
          width="full"
          className={styles.row}
          data-button=""
          title="Applies to all accounts"
          onClick={() => openFrequencyPage()}
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
