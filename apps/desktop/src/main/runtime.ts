import { app } from "electron";
import log from "electron-log/main.js";
import { getPrefs, invalidatePrefs } from "./core/prefs";
import { startHttpServer } from "./http/server";
import { createRuntimeControls } from "./runtime-controls";
import { setTrayVisible } from "./tray";
import { setCloseToTray } from "./window";

export const runtimeControls = createRuntimeControls({
  getPrefs,
  invalidatePrefs,
  startHttpServer,
  setTrayVisible,
  isPackaged: app.isPackaged,
  setLoginItemSettings: (settings) => app.setLoginItemSettings(settings),
  setCloseToTray,
  async applyAppIcon(icon) {
    const { applyAppIcon } = await import("./core/app-icon");
    await applyAppIcon(icon);
  },
  warn: (message, error) => log.warn(message, error),
});
