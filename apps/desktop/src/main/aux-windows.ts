import { BrowserWindow } from "electron";
import log from "electron-log/main.js";
import { lockRendererZoom } from "./lib/lock-renderer-zoom";
import { resolveMainOut, resolvePreload } from "./lib/resolve-preload";

let collectionWindow: BrowserWindow | null = null;

function auxOptions(size: { width: number; height: number }) {
  return {
    width: size.width,
    height: size.height,
    alwaysOnTop: true,
    fullscreenable: false,
    skipTaskbar: false,
    autoHideMenuBar: true,
    titleBarStyle: "hiddenInset" as const,
    webPreferences: {
      preload: resolvePreload("index.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  };
}

async function loadShell(win: BrowserWindow, shell: string) {
  const search = `shell=${encodeURIComponent(shell)}`;
  const devUrl = process.env.ELECTRON_RENDERER_URL;
  try {
    if (devUrl) await win.loadURL(`${devUrl}?${search}`);
    else {
      await win.loadFile(resolveMainOut("../renderer/index.html"), {
        query: Object.fromEntries(new URLSearchParams(search)),
      });
    }
  } catch (err) {
    log.warn("[pond] aux window load failed", shell, err);
  }
}

export async function openCollectionWindow(): Promise<void> {
  if (collectionWindow && !collectionWindow.isDestroyed()) {
    collectionWindow.show();
    collectionWindow.focus();
    return;
  }
  const win = new BrowserWindow(auxOptions({ width: 420, height: 720 }));
  lockRendererZoom(win.webContents);
  collectionWindow = win;
  win.on("closed", () => {
    collectionWindow = null;
  });
  await loadShell(win, "collect");
  win.show();
}
