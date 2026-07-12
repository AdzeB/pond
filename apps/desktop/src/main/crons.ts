import { net } from "electron";
import log from "electron-log/main.js";
import { emptyTrashOlderThan } from "./core/library-ops";
import { getPrefs } from "./core/prefs";
import { maybeUpdateYtDlp } from "./core/refresh/yt-dlp-updater";
import { isSyncBlockedByStorageGuard } from "./core/storage-watcher";
import { syncAllSources } from "./core/sync";
import { watchAll } from "./core/watch/run";
import { schedule } from "./lib/scheduler";

export function registerTrashCron() {
  schedule({
    name: "trash",
    every: 60 * 60 * 1000,
    initialDelay: 30_000,
    fn: async () => {
      const prefs = await getPrefs();
      const days = prefs.trash.autoEmptyDays;
      if (days === null) return;
      const purged = await emptyTrashOlderThan(days);
      if (purged > 0) {
        log.info(
          `[pond trash-cron] purged ${purged} items older than ${days}d`,
        );
      }
    },
  });
}

export function registerYtDlpUpdateCron() {
  schedule({
    name: "yt-dlp-update",
    every: 24 * 60 * 60 * 1000,
    // yt-dlp isn't bundled; check soon after launch, then daily.
    initialDelay: 5_000,
    fn: () => maybeUpdateYtDlp(),
  });
}

// Last cron run this session; 0 = never, so the first due-check does a catch-up.
let lastSyncCronRunAt = 0;
// Random pre-run delay so many installs don't hit a platform in lockstep.
const SYNC_CRON_JITTER_MS = 10 * 60_000;

// Background sync scheduler. Unattended traffic is the highest account-risk path,
// so it short-circuits on disabled-pref / offline / storage-guard / not-yet-due
// and otherwise defers to the rate governor.
export function registerSyncCron() {
  schedule({
    name: "sync-all",
    // Poll every 30m and decide if a run is due, so the configured interval can
    // change at runtime without re-registering the job.
    every: 30 * 60_000,
    initialDelay: 5 * 60_000,
    fn: async () => {
      const prefs = await getPrefs();
      const cron = prefs.sync.cron;
      if (!cron.enabled) return;
      if (isSyncBlockedByStorageGuard()) {
        log.info("[pond sync-cron] storage guard active, skipping");
        return;
      }
      if (!net.isOnline()) {
        log.info("[pond sync-cron] offline, skipping");
        return;
      }
      const intervalMs = Math.max(1, cron.intervalHours) * 60 * 60_000;
      if (Date.now() - lastSyncCronRunAt < intervalMs) return;

      const jitter = Math.floor(Math.random() * SYNC_CRON_JITTER_MS);
      await new Promise((resolve) => setTimeout(resolve, jitter));
      // Re-check online after the jitter wait; connectivity may have dropped.
      if (!net.isOnline()) return;

      lastSyncCronRunAt = Date.now();
      log.info("[pond sync-cron] starting background sync", {
        intervalHours: cron.intervalHours,
      });
      await syncAllSources({ trigger: "cron" });
      // Watched public accounts poll on the same cadence; they don't gate on
      // isAccountConnected (public listings need no session).
      await watchAll({ trigger: "cron" });
    },
  });
}
