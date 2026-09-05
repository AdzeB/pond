import {
  IconDownloadOutline18 as Download,
  IconFileRefreshOutline18 as FileRefresh,
  IconRefreshOutline18 as Refresh,
} from "@pond/icons/outline/18";
import { Button, PageDialog } from "@pond/ui";
import { cardModel } from "@/features/sources/components/sync-monitor/lib/helpers";
import { useAccounts } from "@/features/sources/hooks/use-accounts";
import { useDetailAccountId } from "@/features/sources/state/source-detail";
import { useSyncByAccount } from "@/features/sources/state/sync-monitor";
import styles from "./account-detail.module.css";

export function AccountMaintenanceSection() {
  const { accounts } = useAccounts();
  const accountId = useDetailAccountId();
  const account = accounts.find((row) => row.id === accountId) ?? accounts[0];
  const byAccount = useSyncByAccount();

  if (!account) return null;

  const model = cardModel(byAccount[account.id]);

  return (
    <>
      <PageDialog.Description>
        Re-fetch older items, metadata, or original-quality media.
      </PageDialog.Description>
      <div className={styles.rows}>
        <Button
          variant="ghost"
          size="xl"
          width="full"
          className={styles.row}
          data-button=""
          disabled={!(model.connected && model.tone !== "run")}
          onClick={() =>
            void window.pond.syncRunNow(account.id, { forceFull: true })
          }
        >
          <span className={styles.icon}>
            <Refresh size={18} />
          </span>
          <span className={styles.label}>Backfill</span>
        </Button>
        <Button
          variant="ghost"
          size="xl"
          width="full"
          className={styles.row}
          data-button=""
          disabled={!model.connected}
          onClick={() =>
            void window.pond.refreshBackfillStart({ source: account.source })
          }
        >
          <span className={styles.icon}>
            <FileRefresh size={18} />
          </span>
          <span className={styles.label}>Refresh Metadata</span>
        </Button>
        <Button
          variant="ghost"
          size="xl"
          width="full"
          className={styles.row}
          data-button=""
          disabled={!model.connected}
          onClick={() =>
            void window.pond.refreshBackfillStart({
              source: account.source,
              overwrite: true,
            })
          }
        >
          <span className={styles.icon}>
            <Download size={18} />
          </span>
          <span className={styles.label}>Download Full Quality</span>
        </Button>
      </div>
    </>
  );
}
