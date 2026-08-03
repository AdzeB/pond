import { FREQUENCY_OPTIONS } from "@/components/library/sources/page/lib/helpers";
import { usePrefs } from "@/stores/prefs";

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
