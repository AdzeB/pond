import { DEFAULT_SYNC_CRON } from "@pond/schema/db";
import { Button } from "@pond/ui";
import { usePrefs } from "@/features/settings/state/prefs";
import { FREQUENCY_OPTIONS } from "@/features/sources/components/page/lib/helpers";
import { sourceFlow } from "@/features/sources/state/source-flow";
import styles from "./frequency.module.css";

export function openFrequencyPage(): void {
  sourceFlow.push("sync-frequency");
}

export function FrequencySection() {
  const [sync, patchSync] = usePrefs("sync");
  const cron = sync.cron ?? DEFAULT_SYNC_CRON;

  const pick = (next: { enabled: boolean; intervalHours: number }) => {
    patchSync({ cron: next });
    sourceFlow.back();
  };

  return (
    <div className={styles.rows}>
      {FREQUENCY_OPTIONS.map((option) => {
        const active = cron.enabled && cron.intervalHours === option.hours;
        return (
          <Button
            key={option.hours}
            variant="ghost"
            size="xl"
            width="full"
            aria-pressed={active}
            className={styles.row}
            data-button=""
            onClick={() => pick({ enabled: true, intervalHours: option.hours })}
          >
            {active ? <span aria-hidden className={styles.ring} /> : null}
            <span className={styles.label}>{option.label}</span>
          </Button>
        );
      })}
      <Button
        variant="ghost"
        size="xl"
        width="full"
        aria-pressed={!cron.enabled}
        className={styles.row}
        data-button=""
        onClick={() => pick({ ...cron, enabled: false })}
      >
        {!cron.enabled ? <span aria-hidden className={styles.ring} /> : null}
        <span className={styles.label}>Manual Only</span>
      </Button>
    </div>
  );
}
