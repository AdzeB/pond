import { join } from "node:path";
import type { Capture } from "@pond/schema/raw";
import { buildTweetCardData, type TweetCardData } from "@shared/tweet-card";
import { BrowserWindow } from "electron";
import log from "electron-log/main.js";
import sharp from "sharp";

export interface RenderedCard {
  bytes: Buffer;
  width: number;
  height: number;
}

// Fixed card width in CSS px; matches the capture entry's default.
const CARD_WIDTH = 550;
// Starting window height; grows to fit a taller card before capture.
const INITIAL_HEIGHT = 1400;
// Hard cap so a runaway card can't allocate an enormous surface.
const MAX_HEIGHT = 8192;
// Capture at 2x so the cover stays crisp on retina displays.
const SCALE = 2;
// Scheme-colored padding around the card, in CSS px (scaled at capture time).
const PAD_CSS = 24;
const READY_TIMEOUT_MS = 12_000;
const LOAD_TIMEOUT_MS = 15_000;
const CDP_TIMEOUT_MS = 10_000;
const CAPTURE_TIMEOUT_MS = 15_000;
// Whole-render budget; on overrun the window is torn down for a clean retry.
const RENDER_TIMEOUT_MS = 30_000;

let win: BrowserWindow | null = null;
// Serialize renders through the single hidden window.
let chain: Promise<unknown> = Promise.resolve();

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    p,
    sleep(ms).then(() => {
      throw new Error(`${label} timed out after ${ms}ms`);
    }),
  ]);
}

function ensureWindow(): BrowserWindow {
  if (win && !win.isDestroyed()) return win;
  win = new BrowserWindow({
    show: false,
    width: CARD_WIDTH + 2,
    height: INITIAL_HEIGHT,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      // Hidden windows otherwise throttle timers/rAF, stalling image loads.
      backgroundThrottling: false,
    },
  });
  win.on("closed", () => {
    win = null;
  });
  return win;
}

function captureSearch(scheme: "light" | "dark", data: TweetCardData): string {
  const base64 = Buffer.from(JSON.stringify(data), "utf8").toString("base64");
  return `scheme=${scheme}&w=${CARD_WIDTH}&data=${encodeURIComponent(base64)}`;
}

async function loadCapture(
  target: BrowserWindow,
  scheme: "light" | "dark",
  data: TweetCardData,
): Promise<void> {
  const search = captureSearch(scheme, data);
  const devUrl = process.env.ELECTRON_RENDERER_URL;
  const load = devUrl
    ? target.loadURL(`${devUrl}/capture.html?${search}`)
    : target.loadFile(join(__dirname, "../renderer/capture.html"), { search });
  await withTimeout(load, LOAD_TIMEOUT_MS, "capture load");
}

interface CardRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

async function readCardRect(target: BrowserWindow): Promise<CardRect | null> {
  const expr = `(async () => {
    const deadline = Date.now() + ${READY_TIMEOUT_MS};
    while (Date.now() < deadline && document.documentElement.dataset.ready !== "1") {
      await new Promise((r) => setTimeout(r, 50));
    }
    const el = document.querySelector("[data-capture-card] > *");
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  })()`;
  const raw = await withTimeout(
    target.webContents.executeJavaScript(expr, true),
    READY_TIMEOUT_MS + 2000,
    "card rect",
  );
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<CardRect>;
  if (
    typeof r.x !== "number" ||
    typeof r.y !== "number" ||
    typeof r.width !== "number" ||
    typeof r.height !== "number" ||
    r.width < 8 ||
    r.height < 8
  ) {
    return null;
  }
  return { x: r.x, y: r.y, width: r.width, height: r.height };
}

// Capture `rect` at SCALE via CDP device-metrics override (capturePage rect is
// in CSS px; the resulting NativeImage is at the overridden device scale).
async function captureAtScale(
  target: BrowserWindow,
  rect: CardRect,
): Promise<Electron.NativeImage> {
  const dbg = target.webContents.debugger;
  let attached = false;
  if (!dbg.isAttached()) {
    dbg.attach("1.3");
    attached = true;
  }
  try {
    const [w, h] = target.getContentSize();
    await withTimeout(
      dbg.sendCommand("Emulation.setDeviceMetricsOverride", {
        width: w ?? CARD_WIDTH,
        height: h ?? INITIAL_HEIGHT,
        deviceScaleFactor: SCALE,
        mobile: false,
      }),
      CDP_TIMEOUT_MS,
      "setDeviceMetricsOverride",
    );
    // Let the override settle into a repaint before grabbing the surface.
    await sleep(50);
    return await withTimeout(
      target.webContents.capturePage({
        x: Math.max(0, Math.floor(rect.x)),
        y: Math.max(0, Math.floor(rect.y)),
        width: Math.max(1, Math.ceil(rect.width)),
        height: Math.max(1, Math.ceil(rect.height)),
      }),
      CAPTURE_TIMEOUT_MS,
      "capturePage",
    );
  } finally {
    try {
      await withTimeout(
        dbg.sendCommand("Emulation.clearDeviceMetricsOverride"),
        CDP_TIMEOUT_MS,
        "clearDeviceMetricsOverride",
      );
    } catch {
      /* override may already be cleared */
    }
    if (attached) {
      try {
        dbg.detach();
      } catch {
        /* wc may be gone */
      }
    }
  }
}

async function pad(
  bytes: Buffer,
  scheme: "light" | "dark",
): Promise<RenderedCard> {
  const p = PAD_CSS * SCALE;
  const background =
    scheme === "light"
      ? { r: 255, g: 255, b: 255, alpha: 1 }
      : { r: 0, g: 0, b: 0, alpha: 1 };
  const out = await sharp(bytes)
    .extend({ top: p, bottom: p, left: p, right: p, background })
    .png()
    .toBuffer({ resolveWithObject: true });
  return { bytes: out.data, width: out.info.width, height: out.info.height };
}

async function renderOne(
  data: TweetCardData,
  scheme: "light" | "dark",
): Promise<RenderedCard | null> {
  const target = ensureWindow();
  await loadCapture(target, scheme, data);

  let rect = await readCardRect(target);
  if (!rect) {
    log.warn("[pond render-card] card not ready", scheme);
    return null;
  }

  // capturePage crops overflow, so grow the window to fit a taller card.
  const [, contentHeight] = target.getContentSize();
  const needed = Math.ceil(rect.y + rect.height + 8);
  if (needed > (contentHeight ?? INITIAL_HEIGHT)) {
    target.setContentSize(CARD_WIDTH + 2, Math.min(needed, MAX_HEIGHT));
    await sleep(150);
    rect = (await readCardRect(target)) ?? rect;
  }

  const image = await captureAtScale(target, rect);
  if (image.getSize().width === 0) return null;
  const raw = image.toPNG();
  if (raw.byteLength === 0) return null;
  return pad(raw, scheme);
}

// Render a tweet's card to a padded cover PNG. Returns null when the capture
// lacks enough data or rendering fails, so callers can fall back.
export async function renderTweetCardPng(
  capture: Capture | undefined | null,
  fallbackAuthor: string | null | undefined,
  scheme: "light" | "dark",
): Promise<RenderedCard | null> {
  const data = buildTweetCardData(capture, fallbackAuthor);
  // Need at least an author plus some content to be worth rendering.
  if (!data || (!data.text && (!data.media || data.media.length === 0))) {
    return null;
  }
  const run = chain.then(async () => {
    try {
      return await withTimeout(
        renderOne(data, scheme),
        RENDER_TIMEOUT_MS,
        "render",
      );
    } catch (err) {
      log.warn("[pond render-card] render failed", scheme, err);
      // A wedged window would stall every later render; drop it for a fresh one.
      disposeRenderCardWindow();
      return null;
    }
  });
  chain = run.catch(() => undefined);
  return run;
}

export function disposeRenderCardWindow(): void {
  if (win && !win.isDestroyed()) win.destroy();
  win = null;
}
