import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { app, type NativeImage, nativeImage } from "electron";
import log from "electron-log/main.js";
import sharp from "sharp";
import {
  appIconLabel,
  DEFAULT_APP_ICON,
  resolveAppIconId,
  sortAppIconIds,
} from "../../shared/app-icons";
import { getPrefs } from "./prefs";

export interface AppIconOption {
  id: string;
  label: string;
  preview: string;
}

/** Same inset as prepare-app-icon so Dock tiles match native macOS sizing. */
const DOCK_CONTENT_SCALE = 0.8;
const PREVIEW_SIZE = 96;

const previewCache = new Map<string, string>();
const dockCache = new Map<string, NativeImage>();

function tintsRoot(): string {
  if (app.isPackaged) return join(process.resourcesPath, "app-icons");
  return join(__dirname, "../../../../packages/icons/brand/tints");
}

function iconFile(id: string): string | null {
  const dir = join(tintsRoot(), id);
  const preferred = join(dir, "default.png");
  if (existsSync(preferred)) return preferred;
  const dumped = join(dir, "Pond-iOS-Default-1024x1024@1x.png");
  if (existsSync(dumped)) return dumped;
  return null;
}

function availableIds(): string[] {
  const root = tintsRoot();
  if (!existsSync(root)) return [];
  const ids: string[] = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (iconFile(entry.name)) ids.push(entry.name);
  }
  return sortAppIconIds(ids);
}

export function resolveAppIconPath(id: string): string | null {
  const available = new Set(availableIds());
  const resolved = resolveAppIconId(id, available);
  return iconFile(resolved);
}

async function dockImage(path: string): Promise<NativeImage> {
  const cached = dockCache.get(path);
  if (cached) return cached;
  const meta = await sharp(path).metadata();
  const size = meta.width ?? 1024;
  const contentSize = Math.round(size * DOCK_CONTENT_SCALE);
  const offset = Math.round((size - contentSize) / 2);
  const content = await sharp(path)
    .ensureAlpha()
    .resize(contentSize, contentSize)
    .png()
    .toBuffer();
  const buf = await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: content, left: offset, top: offset }])
    .png()
    .toBuffer();
  const image = nativeImage.createFromBuffer(buf);
  dockCache.set(path, image);
  return image;
}

async function previewDataUrl(path: string): Promise<string> {
  const cached = previewCache.get(path);
  if (cached) return cached;
  const buf = await sharp(path)
    .ensureAlpha()
    .resize(PREVIEW_SIZE, PREVIEW_SIZE)
    .png()
    .toBuffer();
  const url = `data:image/png;base64,${buf.toString("base64")}`;
  previewCache.set(path, url);
  return url;
}

export async function listAppIcons(): Promise<AppIconOption[]> {
  const options: AppIconOption[] = [];
  for (const id of availableIds()) {
    const path = iconFile(id);
    if (!path) continue;
    options.push({
      id,
      label: appIconLabel(id),
      preview: await previewDataUrl(path),
    });
  }
  return options;
}

export async function applyAppIcon(id?: string): Promise<void> {
  const prefs = id == null ? await getPrefs().catch(() => null) : null;
  const path = resolveAppIconPath(
    id ?? prefs?.window.appIcon ?? DEFAULT_APP_ICON,
  );
  if (!path) {
    log.warn("[pond] app icon file missing", id);
    return;
  }
  try {
    const image = await dockImage(path);
    if (process.platform === "darwin") app.dock?.setIcon(image);
    else {
      const { getMainWindow } = await import("../window");
      const win = getMainWindow();
      if (win && !win.isDestroyed()) win.setIcon(image);
    }
  } catch (err) {
    log.warn("[pond] apply app icon failed", err);
  }
}
