import type { BrowserWindow } from "electron";

interface MainWindowState {
  current: BrowserWindow | null;
}

export const mainWindowState: MainWindowState = { current: null };
