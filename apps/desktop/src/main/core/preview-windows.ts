import { saves } from "@pond/schema/db";
import { eq } from "drizzle-orm";
import { BrowserWindow, type IpcMain, type IpcMainInvokeEvent } from "electron";
import { z } from "zod";
import { IPC } from "../../shared/constants";
import {
  type PreviewNeighborRequest,
  PreviewNeighborRequestSchema,
  type PreviewWindowConfigure,
  PreviewWindowConfigureSchema,
  type PreviewWindowNavigate,
  PreviewWindowNavigateSchema,
  type PreviewWindowOpen,
  PreviewWindowOpenSchema,
  type PreviewWindowState,
} from "../../shared/preview-window-contracts";
import { getDb } from "../db";
import { isTrustedSender } from "../ipc/helpers";
import { toWireSave } from "../ipc/wire";
import { resolveMainOut, resolvePreload } from "../lib/resolve-preload";
import { localizeMainCopy } from "../localization-runtime";
import { mainWindowState } from "../window-state";
import { getPrefs } from "./prefs";
import { assertLibraryUnlocked } from "./security/app-lock-runtime";
import { saveIsLocked } from "./security/folder-passwords";

interface PreviewEntry {
  window: BrowserWindow;
  state: PreviewWindowState;
}

const entries = new Map<number, PreviewEntry>();
const PreviewWindowIdSchema = z.number().int().positive();

async function resolvePreviewTarget(
  saveId: string,
  fileIndex: number,
): Promise<{ title: string; url: string }> {
  assertLibraryUnlocked();
  if (await saveIsLocked(saveId))
    throw new Error(localizeMainCopy("The Save is locked."));
  const db = await getDb();
  const row = db.select().from(saves).where(eq(saves.id, saveId)).get();
  if (!row) throw new Error(localizeMainCopy("The Save no longer exists."));
  const save = toWireSave(row);
  const file = save.files[fileIndex];
  if (!file) throw new Error(localizeMainCopy("The image no longer exists."));
  const image =
    file.mimeType?.startsWith("image/") ||
    /\.(avif|gif|jpe?g|png|webp)$/i.test(file.path);
  if (!image)
    throw new Error(localizeMainCopy("Detached windows support images."));
  return {
    title: save.title || file.path,
    url: `pond://${saveId}/${encodeURIComponent(file.path).replace(/%2F/gi, "/")}`,
  };
}

function sendState(entry: PreviewEntry): void {
  if (!entry.window.isDestroyed()) {
    entry.window.webContents.send(IPC.previewState, entry.state);
  }
}

async function createPreviewWindow(
  input: PreviewWindowOpen,
): Promise<{ windowId: number }> {
  const target = await resolvePreviewTarget(input.saveId, input.fileIndex);
  const prefs = await getPrefs();
  const presentation = input.kind === "presentation";
  const window = new BrowserWindow({
    width: presentation ? 1280 : 720,
    height: presentation ? 800 : 560,
    minWidth: 320,
    minHeight: 240,
    show: false,
    frame: !presentation,
    fullscreenable: presentation,
    alwaysOnTop: !presentation,
    backgroundColor: "#000000",
    autoHideMenuBar: true,
    webPreferences: {
      preload: resolvePreload("preview.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false,
    },
  });
  const state: PreviewWindowState = {
    windowId: window.id,
    saveId: input.saveId,
    fileIndex: input.fileIndex,
    kind: input.kind,
    title: target.title,
    locale: prefs.localization.locale,
    url: target.url,
    opacity: 1,
    alwaysOnTop: !presentation,
    rotation: 0,
    mirrored: false,
    grayscale: false,
    size: "fit",
  };
  const entry = { window, state };
  entries.set(window.id, entry);
  window.on("closed", () => entries.delete(window.id));
  window.once("ready-to-show", () => {
    if (presentation) window.setFullScreen(true);
    window.show();
  });
  window.webContents.on("did-finish-load", () => sendState(entry));

  const devUrl = process.env.ELECTRON_RENDERER_URL;
  if (devUrl) await window.loadURL(`${devUrl.replace(/\/$/, "")}/preview.html`);
  else await window.loadFile(resolveMainOut("../renderer/preview.html"));
  return { windowId: window.id };
}

function configurePreviewWindow(input: PreviewWindowConfigure): void {
  const entry = entries.get(input.windowId);
  if (!entry || entry.window.isDestroyed())
    throw new Error(localizeMainCopy("The preview window closed."));
  entry.state = { ...entry.state, ...input };
  if (input.opacity !== undefined) entry.window.setOpacity(input.opacity);
  if (input.alwaysOnTop !== undefined)
    entry.window.setAlwaysOnTop(input.alwaysOnTop);
  sendState(entry);
}

async function navigatePreviewWindow(
  input: PreviewWindowNavigate,
): Promise<void> {
  const entry = entries.get(input.windowId);
  if (!entry || entry.window.isDestroyed())
    throw new Error(localizeMainCopy("The preview window closed."));
  const target = await resolvePreviewTarget(input.saveId, input.fileIndex);
  entry.state = {
    ...entry.state,
    saveId: input.saveId,
    fileIndex: input.fileIndex,
    title: target.title,
    url: target.url,
    rotation: 0,
    mirrored: false,
    grayscale: false,
  };
  sendState(entry);
}

function requestPreviewNeighbor(
  event: IpcMainInvokeEvent,
  input: PreviewNeighborRequest,
): void {
  const entry = entries.get(input.windowId);
  if (
    !entry ||
    entry.window.isDestroyed() ||
    event.sender.id !== entry.window.webContents.id
  )
    throw new Error(localizeMainCopy("The preview window closed."));
  mainWindowState.current?.webContents.send(IPC.previewNeighborRequest, input);
}

function closePreviewWindow(windowId: PreviewWindowState["windowId"]): void {
  entries.get(windowId)?.window.close();
}

export function closePreviewWindows(): void {
  for (const entry of entries.values()) {
    if (!entry.window.isDestroyed()) entry.window.close();
  }
  entries.clear();
}

export function registerPreviewWindowHandlers(bus: IpcMain): void {
  bus.handle(IPC.previewOpen, (event, raw) => {
    if (!isTrustedSender(event)) throw new Error("untrusted sender");
    return createPreviewWindow(PreviewWindowOpenSchema.parse(raw));
  });
  bus.handle(IPC.previewConfigure, (event, raw) => {
    if (!isTrustedSender(event)) throw new Error("untrusted sender");
    configurePreviewWindow(PreviewWindowConfigureSchema.parse(raw));
  });
  bus.handle(IPC.previewNavigate, (event, raw) => {
    if (!isTrustedSender(event)) throw new Error("untrusted sender");
    return navigatePreviewWindow(PreviewWindowNavigateSchema.parse(raw));
  });
  bus.handle(IPC.previewNeighborRequest, (event, raw) => {
    if (!isTrustedSender(event)) throw new Error("untrusted sender");
    requestPreviewNeighbor(event, PreviewNeighborRequestSchema.parse(raw));
  });
  bus.handle(IPC.previewClose, (event, raw) => {
    if (!isTrustedSender(event)) throw new Error("untrusted sender");
    closePreviewWindow(PreviewWindowIdSchema.parse(raw));
  });
}
