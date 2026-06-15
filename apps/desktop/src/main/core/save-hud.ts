import { join } from "node:path";
import { BrowserWindow, ipcMain, nativeTheme, screen } from "electron";
import log from "electron-log/main.js";
import { IPC } from "../../shared/constants";
import { applyHudGlass, forgetHudGlass, loadHudGlass } from "./hud-glass";
import { getPrefs } from "./prefs";

export interface SaveHudPayload {
  id: string;
  source: string;
  avatarUrl?: string | null;
}

// Transparent padding around the measured card: leaves room for the drop shadow
// and the card's slide-in transform so nothing gets clipped by the window edge.
// Only used in the CSS fallback path; native glass fills the whole window, so
// the window must hug the pill exactly (pad 0) to read as a capsule.
const WINDOW_PAD = 56;
// Gap between the pill and the bottom of the work area (matches the design).
const BOTTOM_GAP = 40;

let hud: BrowserWindow | null = null;
let loaded: Promise<void> | null = null;
let ipcRegistered = false;
let onActivate: ((saveId: string) => void) | null = null;
// True once the native NSGlassEffectView binding is loaded and usable. Drives
// window padding, the renderer's styling, and whether we attach the glass view.
let nativeGlass = false;
let glassApplied = false;
// The renderer subscribes to IPC.saveHud only after it mounts, which happens
// after the page finishes loading; buffer payloads until it signals readiness so
// the first save is never dropped.
let rendererReady = false;
let pending: SaveHudPayload[] = [];

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

async function ensureWindow(): Promise<BrowserWindow> {
  if (hud && !hud.isDestroyed()) {
    await loaded;
    return hud;
  }

  const isMac = process.platform === "darwin";
  const shellHint = await resolveShellHint();
  nativeGlass = (await loadHudGlass()) !== null;

  const win = new BrowserWindow({
    width: 480,
    height: 160,
    show: false,
    frame: false,
    transparent: true,
    backgroundColor: "#00000000",
    hasShadow: false,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    // Never take keyboard focus away from the browser the user is saving from.
    focusable: false,
    alwaysOnTop: true,
    acceptFirstMouse: true,
    roundedCorners: false,
    ...(isMac ? { type: "panel" as const } : {}),
    webPreferences: {
      preload: join(__dirname, "../preload/index.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      additionalArguments: [`--pond-shell=${JSON.stringify(shellHint)}`],
    },
  });

  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  win.setAlwaysOnTop(true, "screen-saver");
  win.on("closed", () => {
    forgetHudGlass(win);
    if (hud === win) {
      hud = null;
      loaded = null;
      rendererReady = false;
      pending = [];
      glassApplied = false;
    }
  });

  hud = win;

  const devUrl = process.env.ELECTRON_RENDERER_URL;
  loaded = (
    devUrl
      ? win.loadURL(`${devUrl}/hud.html`)
      : win.loadFile(join(__dirname, "../renderer/hud.html"))
  ).catch((err) => {
    log.warn("[pond hud] failed to load hud window", err);
  });
  await loaded;
  return win;
}

function placeBottomCenter(
  win: BrowserWindow,
  width: number,
  height: number,
): void {
  const pad = nativeGlass ? 0 : WINDOW_PAD;
  const cursor = screen.getCursorScreenPoint();
  const display = screen.getDisplayNearestPoint(cursor);
  const area = display.workArea;
  const w = Math.min(Math.ceil(width) + pad, area.width);
  const h = Math.min(Math.ceil(height) + pad, area.height);
  const x = Math.round(area.x + (area.width - w) / 2);
  const y = area.y + area.height - h - BOTTOM_GAP;
  win.setBounds({ x, y, width: w, height: h });
}

// Renderer reads `nativeGlass` to thin the pill fill and drop the CSS drop
// shadow when a real glass surface sits behind it.
function sendPayload(win: BrowserWindow, payload: SaveHudPayload): void {
  win.webContents.send(IPC.saveHud, { ...payload, nativeGlass });
}

function flushPending(): void {
  if (!hud || hud.isDestroyed() || !rendererReady) return;
  for (const p of pending) sendPayload(hud, p);
  pending = [];
}

export async function showSaveHud(payload: SaveHudPayload): Promise<void> {
  try {
    const win = await ensureWindow();
    if (win.isDestroyed()) return;
    // The renderer reveals the window via resizeSaveHud once the card has
    // measured, so it never flashes empty or in the wrong place.
    if (rendererReady) sendPayload(win, payload);
    else pending.push(payload);
    log.info("[pond hud] show", { id: payload.id, ready: rendererReady });
  } catch (err) {
    log.warn("[pond hud] showSaveHud failed", err);
  }
}

// Renderer reports the measured card size (0x0 once dismissed) so the window
// hugs the pill and centers it, and hides when there is nothing to show.
export function resizeSaveHud(width: number, height: number): void {
  if (!hud || hud.isDestroyed()) return;
  if (width <= 0 || height <= 0) {
    if (hud.isVisible()) hud.hide();
    return;
  }
  placeBottomCenter(hud, width, height);
  if (!hud.isVisible()) hud.showInactive();
  // The window now hugs the pill, so its content height == pill height: a
  // corner radius of half that gives a true capsule of glass.
  if (nativeGlass && !glassApplied) {
    glassApplied = applyHudGlass(hud, Math.round(Math.ceil(height) / 2));
  }
}

export function hideSaveHud(): void {
  if (hud && !hud.isDestroyed() && hud.isVisible()) hud.hide();
}

// Called when the user clicks a HUD card; wired by the notifier so it can reuse
// the same focus-main-window + navigate behavior as the native notification.
export function setSaveHudActivation(fn: (saveId: string) => void): void {
  onActivate = fn;
}

export function registerSaveHudIpc(): void {
  if (ipcRegistered) return;
  ipcRegistered = true;
  ipcMain.on(IPC.saveHudResize, (_event, width: unknown, height: unknown) => {
    if (
      typeof width === "number" &&
      Number.isFinite(width) &&
      typeof height === "number" &&
      Number.isFinite(height)
    ) {
      resizeSaveHud(width, height);
    }
  });
  ipcMain.on(IPC.saveHudActivate, (_event, id: unknown) => {
    if (typeof id === "string" && id) {
      hideSaveHud();
      onActivate?.(id);
    }
  });
  ipcMain.on(IPC.saveHudReady, () => {
    rendererReady = true;
    flushPending();
  });
}

export function disposeSaveHud(): void {
  if (hud && !hud.isDestroyed()) hud.destroy();
  hud = null;
  loaded = null;
}
