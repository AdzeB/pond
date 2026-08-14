import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { deflateSync } from "node:zlib";
import { app, type NativeImage, nativeImage } from "electron";
import log from "electron-log/main.js";
import { appDataRoot } from "./paths";

const SPINNER_SIZE = 22;
const SPINNER_DOTS = 8;

export function loadTrayIcon(): NativeImage {
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
      } catch {}
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

let spinnerFrames: NativeImage[] | null = null;

export function getSpinnerFrames(): NativeImage[] {
  if (spinnerFrames) return spinnerFrames;
  const frames: NativeImage[] = [];
  for (let head = 0; head < SPINNER_DOTS; head++) {
    frames.push(makeSpinnerFrame(SPINNER_SIZE, head));
  }
  spinnerFrames = frames;
  return frames;
}

/** A ring of dots with a rotating bright head and fading trail; alpha-only template image so macOS tints it like any other menu glyph. */
function makeSpinnerFrame(size: number, head: number): NativeImage {
  const rgba = Buffer.alloc(size * size * 4);
  const cx = size / 2 - 0.5;
  const cy = size / 2 - 0.5;
  const ringR = size * 0.22;
  const dotR = size * 0.07;

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
