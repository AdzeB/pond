import { BrowserWindow, nativeTheme, screen } from "electron";
import {
  HARVESTER_WINDOW_IPC,
  type HarvesterWindowLocation,
  HarvesterWindowLocationSchema,
} from "../../shared/harvester-window-contracts";
import { attachEditableContextMenu } from "../context-menu";
import { safeHandle } from "../ipc/helpers";
import { detachedWindowTitle } from "../lib/detached-window-chrome";
import { lockRendererZoom } from "../lib/lock-renderer-zoom";
import { resolveMainOut, resolvePreload } from "../lib/resolve-preload";

let harvesterWindow: BrowserWindow | null = null;
let opening: Promise<void> | null = null;
let delivered = false;
let intentNonce = 0;
let location: HarvesterWindowLocation = { section: "sources", intentNonce: 0 };

function stage(next: HarvesterWindowLocation): void {
  const explicit = Object.hasOwn(next, "intent");
  if (explicit && next.intent) intentNonce += 1;
  location = {
    section: next.section ?? location.section ?? "sources",
    intent: explicit ? next.intent : location.intent,
    intentNonce,
  };
}

function harvesterWindowOwnsSender(id: number): boolean {
  return harvesterWindow?.webContents.id === id;
}

export async function openHarvesterWindow(
  next: HarvesterWindowLocation = {},
): Promise<void> {
  stage(next);
  if (opening) await opening;
  if (harvesterWindow && !harvesterWindow.isDestroyed()) {
    if (harvesterWindow.isMinimized()) harvesterWindow.restore();
    if (delivered) {
      harvesterWindow.webContents.send(HARVESTER_WINDOW_IPC.location, location);
    }
    harvesterWindow.show();
    harvesterWindow.focus();
    return;
  }
  delivered = false;
  opening = createHarvesterWindow().finally(() => {
    opening = null;
  });
  await opening;
}

async function createHarvesterWindow(): Promise<void> {
  const display = screen.getDisplayNearestPoint(
    screen.getCursorScreenPoint(),
  ).workArea;
  const width = Math.min(1120, display.width);
  const height = Math.min(760, display.height);
  const isMac = process.platform === "darwin";
  const win = new BrowserWindow({
    title: detachedWindowTitle("Harvester"),
    titleBarStyle: isMac ? "hiddenInset" : "default",
    trafficLightPosition: isMac ? { x: 16, y: 15 } : undefined,
    width,
    height,
    x: display.x + Math.round((display.width - width) / 2),
    y: display.y + Math.round((display.height - height) / 2),
    minWidth: Math.min(860, width),
    minHeight: Math.min(560, height),
    show: false,
    autoHideMenuBar: true,
    backgroundColor: nativeTheme.shouldUseDarkColors ? "#000000" : "#ffffff",
    webPreferences: {
      preload: resolvePreload("index.cjs"),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  });
  harvesterWindow = win;
  lockRendererZoom(win.webContents);
  attachEditableContextMenu(win.webContents);
  win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  win.webContents.on("will-navigate", (event) => event.preventDefault());
  win.once("ready-to-show", () => {
    win.show();
    win.focus();
  });
  win.once("closed", () => {
    if (harvesterWindow !== win) return;
    harvesterWindow = null;
    delivered = false;
  });
  const devUrl = process.env.ELECTRON_RENDERER_URL;
  try {
    if (devUrl)
      await win.loadURL(new URL("harvester.html", `${devUrl}/`).toString());
    else await win.loadFile(resolveMainOut("../renderer/harvester.html"));
  } catch (error) {
    win.destroy();
    throw error;
  }
}

export function registerHarvesterWindowIpc(): void {
  safeHandle(
    HARVESTER_WINDOW_IPC.open,
    async (_event, input?: HarvesterWindowLocation) => {
      await openHarvesterWindow(
        HarvesterWindowLocationSchema.parse(input ?? {}),
      );
    },
  );
  safeHandle(HARVESTER_WINDOW_IPC.ready, (event) => {
    if (!harvesterWindowOwnsSender(event.sender.id))
      throw new Error("Not a Harvester window");
    delivered = true;
    return location;
  });
  safeHandle(HARVESTER_WINDOW_IPC.ack, (event, nonce: number) => {
    if (!harvesterWindowOwnsSender(event.sender.id))
      throw new Error("Not a Harvester window");
    if (nonce !== location.intentNonce) return;
    location = { section: location.section, intentNonce };
  });
  safeHandle(HARVESTER_WINDOW_IPC.close, (event) => {
    if (!harvesterWindowOwnsSender(event.sender.id))
      throw new Error("Not a Harvester window");
    harvesterWindow?.close();
  });
}
