import { DEFAULT_SYNC_CRON } from "@pond/schema/db";
import { usePrefs } from "@/features/settings/state/prefs";
import { FREQUENCY_OPTIONS } from "@/features/sources/components/page/lib/helpers";

export function useFrequencyRow() {
  const [sync] = usePrefs("sync");
  const cron = sync.cron ?? DEFAULT_SYNC_CRON;
  const label = cron.enabled
    ? (FREQUENCY_OPTIONS.find((o) => o.hours === cron.intervalHours)?.label ??
      `Every ${cron.intervalHours} hours`)
    : "Manual only";

  return { label };
}
