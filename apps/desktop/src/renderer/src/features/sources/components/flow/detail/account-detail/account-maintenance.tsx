import {
  IconClockRotateClockwiseOutline18 as History,
  IconImageOutline18 as Image,
  IconNotepadOutline18 as Notepad,
} from "@pond/icons/outline/18";
import { Button } from "@pond/ui";
import { cardModel } from "@/features/sources/components/sync-monitor/lib/helpers";
import { useAccounts } from "@/features/sources/hooks/use-accounts";
import { useDetailAccountId } from "@/features/sources/state/source-detail";
import { useSyncByAccount } from "@/features/sources/state/sync-monitor";
import styles from "../detail.module.css";

export function AccountMaintenanceSection() {
  const { accounts } = useAccounts();
  const accountId = useDetailAccountId();
  const account = accounts.find((row) => row.id === accountId) ?? accounts[0];
  const byAccount = useSyncByAccount();

  if (!account) return null;

  const model = cardModel(byAccount[account.id]);

  return (
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
          <History size={18} />
        </span>
        <span className={styles.label}>Fetch Older Saves</span>
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
          <Notepad size={18} />
        </span>
        <span className={styles.label}>Update Save Details</span>
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
          <Image size={18} />
        </span>
        <span className={styles.label}>Redownload Media</span>
      </Button>
    </div>
  );
}
