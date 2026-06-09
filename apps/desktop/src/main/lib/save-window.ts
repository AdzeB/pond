import { join } from "node:path";
import {
  BrowserWindow,
  nativeTheme,
  type Rectangle,
  screen,
  shell,
} from "electron";
import { IPC } from "../../shared/constants";
import { getPrefs } from "../core/prefs";
import { broadcast } from "./broadcast";

interface ShellHint {
  theme?: "light" | "dark";
  baseL?: number;
  baseC?: number;
  baseH?: number;
  accentL?: number;
  accentC?: number;
  accentH?: number;
  contrast?: number;
  fgDir?: number;
  pointerCursors?: boolean;
}

async function resolveShellHint(): Promise<ShellHint> {
  try {
    const { resolveActiveTheme, themeEngineVars } = await import(
      "@pond/schema/db"
    );
    const prefs = await getPrefs();
    const def = resolveActiveTheme(prefs, nativeTheme.shouldUseDarkColors);
    const v = themeEngineVars(def);
    return {
      theme: v.isDark ? "dark" : "light",
      baseL: v.baseL,
      baseC: v.baseC,
      baseH: v.baseH,
      accentL: v.accentL,
      accentC: v.accentC,
      accentH: v.accentH,
      contrast: v.contrast,
      fgDir: v.fgDir,
      pointerCursors: prefs.preferences.pointerCursors === true,
    };
  } catch {
    return {};
  }
}

// A single reusable viewer window plays the role the side drawer used to:
// clicking a save in the grid navigates this one window instead of spawning a
// new one per save, so browsing the library never floods the screen.
let viewerWindow: BrowserWindow | null = null;

// The main library window is the source of truth for the current ordered list
// (it reflects the active filter/sort/search/route). The viewer snapshots it on
// open via `getNavOrder` and stays live-synced via the broadcast below, so j/k
// navigation in the window matches exactly what the grid shows.
let navOrder: string[] = [];

export function setNavOrder(ids: string[]): void {
  navOrder = ids;
  broadcast(IPC.navOrderChanged, ids);
}

export function getNavOrder(): string[] {
  return navOrder;
}

// The viewer behaves like an inset panel docked inside the library window:
// anchored to the opener's right edge with a uniform gutter, spanning its height
// minus the gutter. With no opener (rare) fall back to the top-right of the
// cursor's display. Geometry is derived fresh on every open rather than
// persisted, so it always tracks the current library window.
const VIEWER_INSET = 24;
const VIEWER_MAX_WIDTH = 440;

function viewerBounds(opener?: BrowserWindow | null): Rectangle {
  const inset = VIEWER_INSET;

  if (opener && !opener.isDestroyed()) {
    const o = opener.getBounds();
    const { workArea } = screen.getDisplayMatching(o);
    const width = Math.max(
      360,
      Math.min(VIEWER_MAX_WIDTH, o.width - inset * 2),
    );
    let height = o.height - inset * 2;
    let x = o.x + o.width - width - inset;
    let y = o.y + inset;
    // Keep the panel fully within the display it lands on.
    height = Math.min(height, workArea.height - inset * 2);
    x = Math.min(Math.max(x, workArea.x), workArea.x + workArea.width - width);
    y = Math.min(Math.max(y, workArea.y), workArea.y + workArea.height - height);
    const result = {
      x: Math.round(x),
      y: Math.round(y),
      width: Math.round(width),
      height: Math.round(height),
    };
    return result;
  }

  const { workArea } = screen.getDisplayNearestPoint(
    screen.getCursorScreenPoint(),
  );
  const width = Math.min(VIEWER_MAX_WIDTH, workArea.width - inset * 2);
  const height = Math.min(800, workArea.height - inset * 2);
  const result = {
    x: Math.round(workArea.x + workArea.width - width - inset),
    y: Math.round(workArea.y + inset),
    width,
    height,
  };
  return result;
}

export async function openSaveWindow(
  saveId: string,
  opener?: BrowserWindow | null,
): Promise<void> {
  if (!saveId) return;

  // Already open: tell the viewer to navigate and surface it without stealing
  // focus, so the user can keep clicking through the grid.
  if (viewerWindow && !viewerWindow.isDestroyed()) {
    if (viewerWindow.isMinimized()) viewerWindow.restore();
    viewerWindow.webContents.send(IPC.viewerNavigate, { id: saveId });
    viewerWindow.showInactive();
    return;
  }

  const isMac = process.platform === "darwin";
  const shellHint = await resolveShellHint();

  // Derive geometry from the current library window every open so the viewer
  // always sits inside it as an inset panel.
  const bounds = viewerBounds(opener);

  const win = new BrowserWindow({
    ...bounds,
    minWidth: 360,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: isMac ? "hidden" : "default",
    webPreferences: {
      preload: join(__dirname, "../preload/index.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      additionalArguments: [`--pond-shell=${JSON.stringify(shellHint)}`],
    },
  });

  // Hide the macOS traffic-light buttons; the window is dragged via the custom
  // header and closed with Esc / Cmd+W.
  if (isMac) win.setWindowButtonVisibility(false);

  viewerWindow = win;

  win.on("closed", () => {
    if (viewerWindow === win) viewerWindow = null;
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
