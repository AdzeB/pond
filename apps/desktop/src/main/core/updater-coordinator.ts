import type {
  OkResult,
  ReasonFailure,
} from "../../shared/query-contracts-shared";
import type { UpdateNotice } from "../../shared/update-notice";

const SIX_HOURS_MS = 6 * 60 * 60 * 1000;

export type UpdateChannel = "stable" | "nightly";

export interface UpdatePreferences {
  autoInstall: boolean;
  channel: UpdateChannel;
}

export interface UpdaterPort {
  autoDownload(): boolean;
  setChannel(channel: UpdateChannel): void;
  setAutoDownload(value: boolean): void;
  setAutoInstallOnQuit(value: boolean): void;
  onAvailable(listener: (version: string) => void): void;
  onNotAvailable(listener: () => void): void;
  onError(listener: (error: Error) => void): void;
  onDownloaded(listener: (version: string) => void): void;
  check(): Promise<{ version?: string } | null>;
  download(): Promise<void>;
  install(): void;
}

export interface UpdaterDependencies {
  isPackaged(): boolean;
  loadUpdater(): Promise<UpdaterPort>;
  loadPreferences(): Promise<UpdatePreferences>;
  publish(notice: UpdateNotice): void;
  scheduleTimeout(callback: () => void, delay: number): void;
  scheduleInterval(callback: () => void, delay: number): void;
  info(message: string, value?: string): void;
  warn(message: string, error: Error): void;
}

function message(error: Error | null, fallback: string): string {
  return error?.message ?? fallback;
}

export function createUpdaterCoordinator(dependencies: UpdaterDependencies) {
  let latestNotice: UpdateNotice | null = null;
  let appliedChannel: UpdateChannel | null = null;

  function publish(notice: UpdateNotice): void {
    latestNotice = notice;
    dependencies.publish(notice);
  }

  async function applyPrefsTo(updater: UpdaterPort): Promise<boolean> {
    const { autoInstall, channel } = await dependencies.loadPreferences();
    const changed = appliedChannel !== null && appliedChannel !== channel;
    appliedChannel = channel;
    updater.setChannel(channel);
    updater.setAutoDownload(autoInstall);
    return changed;
  }

  async function applyPrefs(): Promise<void> {
    if (!dependencies.isPackaged()) return;
    const updater = await dependencies.loadUpdater();
    if (!(await applyPrefsTo(updater))) return;
    void updater.check().catch((error) => {
      dependencies.warn(
        "[pond updater] channel check failed",
        error instanceof Error ? error : new Error("Unknown updater error"),
      );
    });
  }

  async function start(): Promise<void> {
    const updater = await dependencies.loadUpdater();
    updater.setAutoInstallOnQuit(true);
    try {
      await applyPrefsTo(updater);
    } catch (error) {
      appliedChannel = "stable";
      updater.setChannel("stable");
      updater.setAutoDownload(false);
      dependencies.warn(
        "[pond updater] prefs apply failed",
        error instanceof Error ? error : new Error("Unknown updater error"),
      );
    }

    updater.onAvailable((version) => {
      dependencies.info("[pond updater] update available", version);
      publish({
        phase: "available",
        version,
        downloading: updater.autoDownload(),
      });
    });
    updater.onNotAvailable(() => {
      latestNotice = null;
      dependencies.info("[pond updater] no update");
    });
    updater.onError((error) => {
      dependencies.warn("[pond updater] error", error);
    });
    updater.onDownloaded((version) => {
      dependencies.info("[pond updater] downloaded", version);
      publish({ phase: "downloaded", version });
    });

    dependencies.scheduleTimeout(() => {
      void updater.check().catch((error) => {
        dependencies.warn(
          "[pond updater] startup check failed",
          error instanceof Error ? error : new Error("Unknown updater error"),
        );
      });
    }, 2000);
    dependencies.scheduleInterval(() => {
      void updater.check().catch(() => {});
    }, SIX_HOURS_MS);
  }

  function currentNotice(): UpdateNotice | null {
    return latestNotice;
  }

  async function download(): Promise<OkResult | ReasonFailure<"dev_build">> {
    if (!dependencies.isPackaged()) return { ok: false, reason: "dev_build" };
    try {
      const updater = await dependencies.loadUpdater();
      await updater.download();
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        error: message(
          error instanceof Error ? error : null,
          "Couldn't download the update.",
        ),
      };
    }
  }

  async function install(): Promise<OkResult | ReasonFailure<"dev_build">> {
    if (!dependencies.isPackaged()) return { ok: false, reason: "dev_build" };
    try {
      const updater = await dependencies.loadUpdater();
      updater.install();
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        error: message(
          error instanceof Error ? error : null,
          "Couldn't install the update.",
        ),
      };
    }
  }

  async function checkNow(): Promise<
    OkResult<{ version?: string }> | ReasonFailure<"dev_build">
  > {
    if (!dependencies.isPackaged()) return { ok: false, reason: "dev_build" };
    try {
      const updater = await dependencies.loadUpdater();
      const result = await updater.check();
      return { ok: true, version: result?.version };
    } catch (error) {
      return {
        ok: false,
        error: message(
          error instanceof Error ? error : null,
          "Couldn't check for updates.",
        ),
      };
    }
  }

  return {
    applyPrefs,
    checkNow,
    currentNotice,
    download,
    install,
    start,
  };
}
