import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { desktopCapturer, screen } from "electron";
import log from "electron-log/main.js";
import sharp from "sharp";
import { closeCaptureWindow } from "../aux-windows";
import { createManualSave } from "./manual-import";

async function savePng(
  bytes: Buffer,
  title: string,
): Promise<{ ok: boolean; id?: string; error?: string }> {
  const dir = await mkdtemp(join(tmpdir(), "pond-shot-"));
  const path = join(dir, "screenshot.png");
  await writeFile(path, bytes);
  const res = await createManualSave({
    title,
    filePaths: [path],
    tags: ["screenshot"],
  });
  if (!res.ok || !res.id) return { ok: false, error: res.error };
  return { ok: true, id: res.id };
}

async function capturePrimaryPng(): Promise<{
  bytes: Buffer;
  scale: number;
  size: { width: number; height: number };
} | null> {
  const display = screen.getPrimaryDisplay();
  const sources = await desktopCapturer.getSources({
    types: ["screen"],
    thumbnailSize: {
      width: Math.round(display.size.width * display.scaleFactor),
      height: Math.round(display.size.height * display.scaleFactor),
    },
  });
  const source = sources[0];
  if (!source) return null;
  return {
    bytes: source.thumbnail.toPNG(),
    scale: display.scaleFactor,
    size: display.size,
  };
}

export async function captureDisplay(): Promise<{
  ok: boolean;
  id?: string;
  error?: string;
}> {
  try {
    const shot = await capturePrimaryPng();
    if (!shot) return { ok: false, error: "no_display" };
    return savePng(shot.bytes, "Screenshot");
  } catch (err) {
    log.warn("[pond] screenshot failed", err);
    return { ok: false, error: "capture_failed" };
  }
}

export async function captureArea(rect: {
  x: number;
  y: number;
  width: number;
  height: number;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  try {
    closeCaptureWindow();
    const shot = await capturePrimaryPng();
    if (!shot) return { ok: false, error: "no_display" };
    const left = Math.max(0, Math.round(rect.x * shot.scale));
    const top = Math.max(0, Math.round(rect.y * shot.scale));
    const width = Math.max(1, Math.round(rect.width * shot.scale));
    const height = Math.max(1, Math.round(rect.height * shot.scale));
    const cropped = await sharp(shot.bytes)
      .extract({ left, top, width, height })
      .png()
      .toBuffer();
    return savePng(cropped, "Screenshot");
  } catch (err) {
    log.warn("[pond] area screenshot failed", err);
    return { ok: false, error: "capture_failed" };
  }
}

export async function captureWindow(): Promise<{
  ok: boolean;
  id?: string;
  error?: string;
}> {
  try {
    const sources = await desktopCapturer.getSources({
      types: ["window"],
      thumbnailSize: { width: 2560, height: 1440 },
    });
    const source = sources.find(
      (item) => !/pond/i.test(item.name) && !item.thumbnail.isEmpty(),
    );
    if (!source) return { ok: false, error: "no_window" };
    return savePng(source.thumbnail.toPNG(), source.name || "Screenshot");
  } catch (err) {
    log.warn("[pond] window screenshot failed", err);
    return { ok: false, error: "capture_failed" };
  }
}
