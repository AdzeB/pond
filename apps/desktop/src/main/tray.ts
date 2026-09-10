import { type NativeImage, Tray } from "electron";
import log from "electron-log/main.js";
import { getSpinnerFrames, loadTrayIcon } from "./tray-icon";
import { buildMenu, buildTooltip } from "./tray-menu";

export interface TrayHandle {
  tray: Tray;
  refresh: () => Promise<void>;
  destroy: () => void;
}

export interface TrayOptions {
  onOpenLibrary: () => void | Promise<void>;
  onOpenSettings?: () => void | Promise<void>;
  onOpenSave?: (id: string) => void | Promise<void>;
  onOpenCollection?: () => void | Promise<void>;
  onScreenshotDisplay?: () => void | Promise<void>;
  onScreenshotArea?: () => void | Promise<void>;
  onScreenshotWindow?: () => void | Promise<void>;
}

let handle: TrayHandle | null = null;

let lastOpts: TrayOptions | null = null;

const SPINNER_INTERVAL_MS = 90;

let idleIcon: NativeImage | null = null;
let spinnerTimer: ReturnType<typeof setInterval> | null = null;
let spinnerStep = 0;
let syncing = false;

export async function setTrayVisible(visible: boolean): Promise<void> {
  if (visible) {
    if (handle) return;
    if (!lastOpts) return;
    await ensureTray(lastOpts);
    return;
  }
  if (handle) {
    handle.destroy();
    handle = null;
  }
}

export async function ensureTray(opts: TrayOptions): Promise<TrayHandle> {
  lastOpts = opts;
  if (handle) return handle;

  let tray: Tray;
  try {
    const image = loadTrayIcon();
    if (process.platform === "darwin") {
      image.setTemplateImage(true);
    }
    idleIcon = image;
    tray = new Tray(image);
  } catch (err) {
    log.error("[pond tray] failed to create tray", err);
    throw err;
  }
  tray.setToolTip("Pond");
  log.info("[pond tray] created");

  const instance: TrayHandle = {
    tray,
    async refresh() {
      try {
        const { menu, ingesting } = await buildMenu(
          opts,
          () => void handle?.refresh(),
        );
        tray.setContextMenu(menu);
        tray.setToolTip(await buildTooltip());
        setTraySyncing(ingesting);
      } catch (err) {
        log.warn("[pond tray] refresh failed", err);
      }
    },
    destroy() {
      stopSpinner();
      syncing = false;
      if (process.platform === "darwin") tray.setTitle("");
      tray.destroy();
      handle = null;
    },
  };

  handle = instance;
  await instance.refresh();
  return instance;
}

function setTraySyncing(ingesting: number): void {
  const tray = handle?.tray;
  if (!tray) return;

  const active = ingesting > 0;
  if (process.platform === "darwin") {
    tray.setTitle(active ? String(ingesting) : "", {
      fontType: "monospacedDigit",
    });
  }

  if (active === syncing) return;
  syncing = active;

  if (active) {
    const frames = getSpinnerFrames();
    spinnerStep = 0;
    const first = frames[0] ?? idleIcon;
    if (first) tray.setImage(first);
    spinnerTimer = setInterval(() => {
      spinnerStep = (spinnerStep + 1) % frames.length;
      const frame = frames[spinnerStep];
      if (frame && handle?.tray) handle.tray.setImage(frame);
    }, SPINNER_INTERVAL_MS);
  } else {
    stopSpinner();
    if (idleIcon) tray.setImage(idleIcon);
  }
}

function stopSpinner(): void {
  if (spinnerTimer) {
    clearInterval(spinnerTimer);
    spinnerTimer = null;
  }
}
