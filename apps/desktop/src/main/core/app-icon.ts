import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  app,
  type NativeImage,
  nativeImage,
  systemPreferences,
} from "electron";
import log from "electron-log/main.js";
import sharp from "sharp";
import {
  appIconLabel,
  DEFAULT_APP_ICON,
  resolveAppIconId,
  sortAppIconIds,
} from "../../shared/app-icons";
import { resolveMainOut } from "../lib/resolve-preload";
import { getPrefs } from "./prefs";

export interface AppIconOption {
  id: string;
  label: string;
  preview: string;
}

/** Same inset as prepare-app-icon so Dock tiles match native macOS sizing. */
const DOCK_CONTENT_SCALE = 0.8;
const PREVIEW_SIZE = 96;
/** Smaller canvas for in-flight frames; the Dock scales the bitmap to the tile either way. */
const POP_CANVAS = 256;
const POP_FRAME_MS = 16;
const POP_OUT = [0.72, 0.62, 0.52];
const POP_IN = [0.52, 0.66, 0.84, 0.9, 0.84, 0.8];

const previewCache = new Map<string, string>();
const dockCache = new Map<string, NativeImage>();
let lastAppliedPath: string | null = null;
let popGeneration = 0;

/** Packaged: extraResources `app-icons`. Dev: this file emits under `out/main/chunks/`. */
function tintsRoot(): string {
  if (app.isPackaged) return join(process.resourcesPath, "app-icons");
  const candidates = [
    join(app.getAppPath(), "../../packages/icons/brand/tints"),
    resolveMainOut("../../../../packages/icons/brand/tints"),
  ];
  return candidates.find((dir) => existsSync(dir)) ?? candidates[0];
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
  if (!existsSync(root)) {
    log.warn("[pond] app icon tints missing", root);
    return [];
  }
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

/** Keep the bitmap square and scale the glyph inside it. A smaller image is upscaled by the Dock, so the pop would vanish. */
async function insetIcon(
  path: string,
  contentScale: number,
  canvas: number,
): Promise<NativeImage> {
  const contentSize = Math.max(1, Math.round(canvas * contentScale));
  const offset = Math.round((canvas - contentSize) / 2);
  const content = await sharp(path)
    .ensureAlpha()
    .resize(contentSize, contentSize)
    .png()
    .toBuffer();
  const buf = await sharp({
    create: {
      width: canvas,
      height: canvas,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: content, left: offset, top: offset }])
    .png()
    .toBuffer();
  return nativeImage.createFromBuffer(buf);
}

async function dockImage(path: string): Promise<NativeImage> {
  const cached = dockCache.get(path);
  if (cached) return cached;
  const meta = await sharp(path).metadata();
  const image = await insetIcon(path, DOCK_CONTENT_SCALE, meta.width ?? 1024);
  dockCache.set(path, image);
  return image;
}

function prefersReducedMotion(reduceMotion: string | undefined): boolean {
  if (reduceMotion === "always") return true;
  if (reduceMotion === "never") return false;
  return (
    systemPreferences.getAnimationSettings?.()?.prefersReducedMotion === true
  );
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function popDockIcon(
  fromPath: string,
  toPath: string,
  rest: NativeImage,
): Promise<void> {
  const generation = ++popGeneration;
  const stillCurrent = () => generation === popGeneration;
  for (const scale of POP_OUT) {
    if (!stillCurrent()) return;
    app.dock?.setIcon(await insetIcon(fromPath, scale, POP_CANVAS));
    await wait(POP_FRAME_MS);
  }
  for (const scale of POP_IN) {
    if (!stillCurrent()) return;
    app.dock?.setIcon(await insetIcon(toPath, scale, POP_CANVAS));
    await wait(POP_FRAME_MS);
  }
  if (stillCurrent()) app.dock?.setIcon(rest);
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
    try {
      options.push({
        id,
        label: appIconLabel(id),
        preview: await previewDataUrl(path),
      });
    } catch (err) {
      log.warn("[pond] app icon preview failed", id, err);
    }
  }
  return options;
}

export async function applyAppIcon(
  id?: string,
  opts?: { animate?: boolean },
): Promise<void> {
  const prefs =
    id == null || opts?.animate ? await getPrefs().catch(() => null) : null;
  const path = resolveAppIconPath(
    id ?? prefs?.window.appIcon ?? DEFAULT_APP_ICON,
  );
  if (!path) {
    log.warn("[pond] app icon file missing", id);
    return;
  }
  const previous = lastAppliedPath;
  lastAppliedPath = path;
  try {
    const image = await dockImage(path);
    if (process.platform !== "darwin") {
      const { getMainWindow } = await import("../window");
      const win = getMainWindow();
      if (win && !win.isDestroyed()) win.setIcon(image);
      return;
    }
    const animate =
      opts?.animate === true &&
      previous != null &&
      previous !== path &&
      !prefersReducedMotion(prefs?.preferences.reduceMotion);
    if (!animate) {
      popGeneration += 1;
      app.dock?.setIcon(image);
      return;
    }
    await popDockIcon(previous, path, image);
  } catch (err) {
    log.warn("[pond] apply app icon failed", err);
  }
}
