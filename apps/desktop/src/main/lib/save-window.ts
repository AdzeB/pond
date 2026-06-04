import { join } from "node:path";
import { BrowserWindow, shell } from "electron";
import { getPrefs } from "../core/prefs";

interface ShellHint {
  theme?: "light" | "dark" | "high-contrast";
  accentHue?: string;
  customHue?: number;
  neutralHue?: string;
  radius?: number;
  accentIntensity?: number;
  pointerCursors?: boolean;
}

async function resolveShellHint(): Promise<ShellHint> {
  try {
    const prefs = await getPrefs();
    const themePref = prefs.preferences.theme;
    return {
      theme: themePref === "system" ? undefined : themePref,
      accentHue: prefs.preferences.accentHue,
      customHue: prefs.preferences.customHue,
      neutralHue: prefs.preferences.neutralHue,
      radius: prefs.preferences.radius,
      accentIntensity: prefs.preferences.accentIntensity,
      pointerCursors: prefs.preferences.pointerCursors === true,
    };
  } catch {
    return {};
  }
}

const saveWindows = new Map<string, BrowserWindow>();

export async function openSaveWindow(saveId: string): Promise<void> {
  if (!saveId) return;

  const existing = saveWindows.get(saveId);
  if (existing && !existing.isDestroyed()) {
    if (existing.isMinimized()) existing.restore();
    existing.show();
    existing.focus();
    return;
  }

  const isMac = process.platform === "darwin";
  const shellHint = await resolveShellHint();

  const win = new BrowserWindow({
    width: 900,
    height: 700,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: isMac ? "hiddenInset" : "default",
    trafficLightPosition: isMac ? { x: 16, y: 16 } : undefined,
    webPreferences: {
      preload: join(__dirname, "../preload/index.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      additionalArguments: [`--pond-shell=${JSON.stringify(shellHint)}`],
    },
  });

  saveWindows.set(saveId, win);
  win.on("closed", () => {
    if (saveWindows.get(saveId) === win) saveWindows.delete(saveId);
  });
  win.on("ready-to-show", () => win.show());

  win.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: "deny" };
  });

  const devUrl = process.env.ELECTRON_RENDERER_URL;
  win.webContents.on("will-navigate", (event, url) => {
    const allowed =
      (devUrl != null && url.startsWith(devUrl)) ||
      url.startsWith("file://") ||
      url.startsWith("pond://") ||
      url === "about:blank";
    if (!allowed) {
      event.preventDefault();
      try {
        const u = new URL(url);
        if (u.protocol === "http:" || u.protocol === "https:") {
          void shell.openExternal(u.toString());
        }
      } catch {
        /* ignore unparseable */
      }
    }
  });

  const search = `?standalone=save&id=${encodeURIComponent(saveId)}`;
  if (devUrl) {
    await win.loadURL(`${devUrl}/${search}`);
  } else {
    await win.loadFile(join(__dirname, "../renderer/index.html"), {
      search,
    });
  }
}
