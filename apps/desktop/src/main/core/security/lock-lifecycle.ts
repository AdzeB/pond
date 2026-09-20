import { powerMonitor } from "electron";
import log from "electron-log/main.js";
import { getPrefs } from "../prefs";
import { librarySecurityStatus, lockLibraryNow } from "./app-lock-runtime";

const IDLE_CHECK_INTERVAL_MS = 30_000;

export function configureLockLifecycle(): () => void {
  const lockForSleep = (): void => {
    void getPrefs()
      .then((prefs) => {
        if (
          prefs.security.lockOnSleep &&
          librarySecurityStatus().state === "unlocked"
        ) {
          lockLibraryNow();
        }
      })
      .catch((error) =>
        log.warn("[pond security] sleep lock check failed", error),
      );
  };
  powerMonitor.on("suspend", lockForSleep);
  powerMonitor.on("lock-screen", lockForSleep);

  const idleTimer = setInterval(() => {
    void getPrefs()
      .then((prefs) => {
        const minutes = prefs.security.idleMinutes;
        if (
          minutes > 0 &&
          librarySecurityStatus().state === "unlocked" &&
          powerMonitor.getSystemIdleTime() >= minutes * 60
        ) {
          lockLibraryNow();
        }
      })
      .catch((error) =>
        log.warn("[pond security] idle lock check failed", error),
      );
  }, IDLE_CHECK_INTERVAL_MS);
  idleTimer.unref();

  return () => {
    clearInterval(idleTimer);
    powerMonitor.off("suspend", lockForSleep);
    powerMonitor.off("lock-screen", lockForSleep);
  };
}
