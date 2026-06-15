import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { deflateSync } from "node:zlib";
import { type SaveFile, saves } from "@pond/schema/db";
import { count, desc, eq, isNull } from "drizzle-orm";
import {
  app,
  Menu,
  type MenuItemConstructorOptions,
  type NativeImage,
  nativeImage,
  Tray,
} from "electron";
import log from "electron-log/main.js";
import { DEFAULT_INGEST_PORT } from "../shared/constants";
import { syncAllSources } from "./core/sync";
import { getDb } from "./db";
import { getIngestToken, rotateIngestToken } from "./keychain";
import { appDataRoot, itemFile, libraryRoot } from "./paths";

export interface TrayHandle {
  tray: Tray;
  refresh: () => Promise<void>;
  destroy: () => void;
}

interface TrayOptions {
  onOpenLibrary: () => void | Promise<void>;
  onOpenSettings?: () => void | Promise<void>;
  onOpenSave?: (id: string) => void | Promise<void>;
}

let handle: TrayHandle | null = null;

let lastOpts: TrayOptions | null = null;

// How many recent saves to surface in the menu, and the working-state animation.
const RECENTS_LIMIT = 6;
const SPINNER_SIZE = 22;
const SPINNER_DOTS = 8;
const SPINNER_INTERVAL_MS = 90;

// Icon shown when idle; restored after a sync finishes.
let idleIcon: NativeImage | null = null;
let spinnerFrames: NativeImage[] | null = null;
let spinnerTimer: ReturnType<typeof setInterval> | null = null;
let spinnerStep = 0;
let syncing = false;

export async function setTrayVisible(visible: boolean): Promise<void> {
  if (visible) {
    if (handle) return;
    if (!lastOpts) return;
    await ensureTray(lastOpts);
    return;
  }
  if (handle) {
    handle.destroy();
    handle = null;
  }
}

export async function ensureTray(opts: TrayOptions): Promise<TrayHandle> {
  lastOpts = opts;
  if (handle) return handle;

  let tray: Tray;
  try {
    const image = loadTrayIcon();
    if (process.platform === "darwin") {
      image.setTemplateImage(true);
    }
    idleIcon = image;
    tray = new Tray(image);
  } catch (err) {
    log.error("[pond tray] failed to create tray", err);
    throw err;
  }
  tray.setToolTip("Pond");
  log.info("[pond tray] created");

  const instance: TrayHandle = {
    tray,
    async refresh() {
      try {
        const { menu, ingesting } = await buildMenu(opts);
        tray.setContextMenu(menu);
        tray.setToolTip(await buildTooltip());
        setTraySyncing(ingesting > 0);
      } catch (err) {
        log.warn("[pond tray] refresh failed", err);
      }
    },
    destroy() {
      stopSpinner();
      syncing = false;
      tray.destroy();
      handle = null;
    },
  };

  await instance.refresh();
  handle = instance;
  return instance;
}

async function buildTooltip(): Promise<string> {
  try {
    const db = await getDb();
    const [row] = await db
      .select({ n: count() })
      .from(saves)
      .where(isNull(saves.deletedAt));
    const libraryName =
      libraryRoot()
        .split("/")
        .pop()
        ?.replace(/\.(pond|library)$/, "") ?? "Library";
    return `${libraryName} · ${row?.n ?? 0} saves`;
  } catch {
    return "Pond";
  }
}

async function buildMenu(
  opts: TrayOptions,
): Promise<{ menu: Menu; ingesting: number }> {
  const db = await getDb().catch(() => null);

  const [activeRow] = db
    ? await db.select({ n: count() }).from(saves).where(isNull(saves.deletedAt))
    : [];
  const active = Number(activeRow?.n ?? 0);

  const [ingestRow] = db
    ? await db
        .select({ n: count() })
        .from(saves)
        .where(eq(saves.status, "ingesting"))
    : [];
  const ingesting = Number(ingestRow?.n ?? 0);

  const recents = db
    ? await db
        .select({
          id: saves.id,
          title: saves.title,
          author: saves.author,
          url: saves.url,
          files: saves.files,
          coverIndex: saves.coverIndex,
        })
        .from(saves)
        .where(isNull(saves.deletedAt))
        .orderBy(desc(saves.savedAt))
        .limit(RECENTS_LIMIT)
    : [];

  const libraryName =
    libraryRoot()
      .split("/")
      .pop()
      ?.replace(/\.(pond|library)$/, "") ?? "Library";
  const loginItem = app.getLoginItemSettings();

  const headerLabel =
    ingesting > 0
      ? `Saving ${ingesting} item${ingesting === 1 ? "" : "s"}…`
      : `${libraryName} · ${active} saves`;

  const recentItems: MenuItemConstructorOptions[] = recents.map((r) => {
    const item: MenuItemConstructorOptions = {
      label: recentLabel(r),
      click: () => void opts.onOpenSave?.(r.id),
    };
    const icon = loadThumb(r.id, r.files, r.coverIndex);
    if (icon) item.icon = icon;
    return item;
  });

  const template: MenuItemConstructorOptions[] = [
    { label: headerLabel, enabled: false },
    { type: "separator" },
  ];

  if (recentItems.length > 0) {
    template.push({ label: "Recently Saved", enabled: false }, ...recentItems, {
      type: "separator",
    });
  }

  template.push(
    {
      label: "Open Library…",
      accelerator: "CommandOrControl+Shift+P",
      click: () => void opts.onOpenLibrary(),
    },
    {
      label: "Settings…",
      click: () => void (opts.onOpenSettings ?? opts.onOpenLibrary)(),
    },
    {
      label: "Sync Now",
      click: () => {
        void syncAllSources({ trigger: "manual" });
      },
    },
    { type: "separator" },
    {
      label: "Copy Pairing Token",
      click: async () => {
        const { clipboard } = await import("electron");
        const token = await getIngestToken();
        if (token) {
          clipboard.writeText(pairingString(token));
        }
      },
    },
    {
      label: "Rotate Ingest Token…",
      click: async () => {
        await rotateIngestToken();
        void handle?.refresh();
      },
    },
    { type: "separator" },
    {
      label: "Launch at Login",
      type: "checkbox",
      checked: loginItem.openAtLogin,
      click: (menuItem) => {
        if (!app.isPackaged) return;
        app.setLoginItemSettings({
          openAtLogin: menuItem.checked,
          openAsHidden: true,
        });
      },
    },
    { type: "separator" },
    { label: `Pond ${app.getVersion()}`, enabled: false },
    { label: "Quit", accelerator: "CommandOrControl+Q", role: "quit" },
  );

  return { menu: Menu.buildFromTemplate(template), ingesting };
}

function recentLabel(r: {
  title: string | null;
  author: string | null;
  url: string;
}): string {
  const title = r.title?.replace(/\s+/g, " ").trim();
  if (title) return truncate(title);
  const author = r.author?.replace(/\s+/g, " ").trim();
  if (author) return truncate(author);
  const host = hostFromUrl(r.url);
  if (host) return truncate(host);
  return "Untitled";
}

function truncate(value: string): string {
  return value.length > 44 ? `${value.slice(0, 43)}…` : value;
}

function hostFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

// A small color thumbnail for the save's cover, sized for a menu item. Returns
// null for non-image covers or missing files so the item simply renders text.
function loadThumb(
  id: string,
  files: SaveFile[] | null | undefined,
  coverIndex: number | null | undefined,
): NativeImage | null {
  try {
    const list = files ?? [];
    const cover = list[coverIndex ?? 0] ?? list[0];
    if (!cover) return null;
    const path = itemFile(id, cover.path);
    if (!existsSync(path)) return null;
    const img = nativeImage.createFromPath(path);
    if (img.isEmpty()) return null;
    return img.resize({ width: 16, height: 16, quality: "good" });
  } catch {
    return null;
  }
}

// Swap the menu-bar icon for an animated throbber while saves are ingesting,
// mirroring the way editors flip their icon during background work.
function setTraySyncing(active: boolean): void {
  if (active === syncing) return;
  syncing = active;
  const tray = handle?.tray;
  if (!tray) return;

  if (active) {
    const frames = getSpinnerFrames();
    spinnerStep = 0;
    const first = frames[0] ?? idleIcon;
    if (first) tray.setImage(first);
    spinnerTimer = setInterval(() => {
      spinnerStep = (spinnerStep + 1) % frames.length;
      const frame = frames[spinnerStep];
      if (frame && handle?.tray) handle.tray.setImage(frame);
    }, SPINNER_INTERVAL_MS);
  } else {
    stopSpinner();
    if (idleIcon) tray.setImage(idleIcon);
  }
}

function stopSpinner(): void {
  if (spinnerTimer) {
    clearInterval(spinnerTimer);
    spinnerTimer = null;
  }
}

function getSpinnerFrames(): NativeImage[] {
  if (spinnerFrames) return spinnerFrames;
  const frames: NativeImage[] = [];
  for (let head = 0; head < SPINNER_DOTS; head++) {
    frames.push(makeSpinnerFrame(SPINNER_SIZE, head));
  }
  spinnerFrames = frames;
  return frames;
}

// A ring of dots with a bright "head" that rotates and a fading trail; rendered
// as an alpha-only template image so macOS tints it like any other menu glyph.
function makeSpinnerFrame(size: number, head: number): NativeImage {
  const rgba = Buffer.alloc(size * size * 4);
  const cx = size / 2 - 0.5;
  const cy = size / 2 - 0.5;
  const ringR = size * 0.3;
  const dotR = size * 0.085;

  for (let d = 0; d < SPINNER_DOTS; d++) {
    const angle = (d / SPINNER_DOTS) * Math.PI * 2 - Math.PI / 2;
    const px = cx + Math.cos(angle) * ringR;
    const py = cy + Math.sin(angle) * ringR;
    const rel = (((head - d) % SPINNER_DOTS) + SPINNER_DOTS) % SPINNER_DOTS;
    const alpha = Math.round(40 + 215 * (1 - rel / SPINNER_DOTS));
    stampDot(rgba, size, px, py, dotR, alpha);
  }

  const img = nativeImage.createFromBuffer(encodeRgbaPng(size, size, rgba));
  if (process.platform === "darwin") img.setTemplateImage(true);
  return img;
}

function stampDot(
  rgba: Buffer,
  size: number,
  cx: number,
  cy: number,
  r: number,
  alpha: number,
): void {
  const minX = Math.max(0, Math.floor(cx - r));
  const maxX = Math.min(size - 1, Math.ceil(cx + r));
  const minY = Math.max(0, Math.floor(cy - r));
  const maxY = Math.min(size - 1, Math.ceil(cy + r));
  const r2 = r * r;
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy > r2) continue;
      const i = (y * size + x) * 4;
      if (alpha > (rgba[i + 3] ?? 0)) rgba[i + 3] = alpha;
    }
  }
}

function pairingString(token: string): string {
  const url = new URL("pond://pair");
  url.searchParams.set("port", String(DEFAULT_INGEST_PORT));
  url.searchParams.set("token", token);
  return url.toString();
}

function loadTrayIcon(): NativeImage {
  const names = ["trayTemplate.png", "tray.png"];
  const roots = [
    process.resourcesPath ?? "",
    join(__dirname, "../../resources"),
    join(app.getAppPath(), "resources"),
  ].filter(Boolean);

  for (const root of roots) {
    for (const name of names) {
      const p = join(root, name);
      try {
        if (!existsSync(p)) continue;
        const img = nativeImage.createFromPath(p);
        if (img.isEmpty()) continue;
        log.info("[pond tray] loaded icon", { path: p });
        return img;
      } catch {
        /* ignore and fall through */
      }
    }
  }
  log.warn("[pond tray] no packaged icon found, drawing runtime placeholder");
  return makePlaceholderIcon();
}

function makePlaceholderIcon(): NativeImage {
  try {
    const buf = drawGlyphPng(22);
    const img = nativeImage.createFromBuffer(buf);
    if (!img.isEmpty()) return img;
  } catch (err) {
    log.warn("[pond tray] placeholder draw failed", err);
  }
  try {
    const fallback = join(appDataRoot(), "tray.png");
    mkdirSync(appDataRoot(), { recursive: true });
    writeFileSync(fallback, drawGlyphPng(22));
    return nativeImage.createFromPath(fallback);
  } catch {
    return nativeImage.createEmpty();
  }
}

function drawGlyphPng(size: number): Buffer {
  const rgba = Buffer.alloc(size * size * 4);
  const padding = Math.round(size * (2 / 22));
  const inner = size - padding * 2;
  const radius = Math.round(inner * 0.32);
  const rippleR = Math.round(inner * 0.18);
  const cx = padding + inner / 2;
  const cy = padding + inner / 2;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const lx = x - padding;
      const ly = y - padding;
      let inside = false;
      if (lx >= 0 && ly >= 0 && lx < inner && ly < inner) {
        const ix =
          lx < radius ? radius - lx : Math.max(0, lx - (inner - 1 - radius));
        const iy =
          ly < radius ? radius - ly : Math.max(0, ly - (inner - 1 - radius));
        inside = ix === 0 || iy === 0 || ix * ix + iy * iy <= radius * radius;
      }
      if (inside) {
        const dx = x - cx + 0.5;
        const dy = y - cy + 0.5;
        if (dx * dx + dy * dy <= rippleR * rippleR) inside = false;
      }
      if (inside) {
        rgba[i + 3] = 255;
      }
    }
  }
  return encodeRgbaPng(size, size, rgba);
}

function encodeRgbaPng(width: number, height: number, rgba: Buffer): Buffer {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const stride = width * 4;
  const raw = Buffer.alloc(height * (stride + 1));
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    signature,
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", idat),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

function pngChunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])) >>> 0, 0);
  return Buffer.concat([len, t, data, crc]);
}

let crcTable: Uint32Array | null = null;
function crc32(buf: Buffer): number {
  if (!crcTable) {
    crcTable = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crcTable[n] = c >>> 0;
    }
  }
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    const byte = buf[i] ?? 0;
    c = (crcTable[(c ^ byte) & 0xff] ?? 0) ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}
