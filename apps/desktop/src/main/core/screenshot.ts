import { randomUUID } from "node:crypto";
import type { Display } from "electron";
import { desktopCapturer, screen } from "electron";
import log from "electron-log/main.js";
import sharp from "sharp";
import {
  captureWindowBounds,
  captureWindowLibraryRoot,
  closeCaptureWindow,
} from "../aux-windows";
import { libraryRoot } from "../paths";
import { captures } from "./captures";
import { runLibraryTransfer } from "./library-transfers";
import { cropRectangle } from "./screenshot-geometry";
import { chooseDisplay, chooseWindow } from "./screenshot-picker";

async function savePng(
  bytes: Buffer,
  title: string,
): Promise<{ ok: boolean; id?: string; error?: string }> {
  await captures.accept({
    id: randomUUID(),
    mode: "quick",
    trigger: "screenshot",
    metadata: { title, tags: ["screenshot"], folderIds: [] },
    items: [
      {
        kind: "image",
        title,
        dataUrl: `data:image/png;base64,${bytes.toString("base64")}`,
      },
    ],
  });
  return { ok: true };
}

async function captureDisplayPng(display: Display) {
  const sources = await desktopCapturer.getSources({
    types: ["screen"],
    thumbnailSize: {
      width: Math.round(display.size.width * display.scaleFactor),
      height: Math.round(display.size.height * display.scaleFactor),
    },
  });
  const source = sources.find((item) => item.display_id === String(display.id));
  if (!source || source.thumbnail.isEmpty()) return null;
  return {
    bytes: source.thumbnail.toPNG(),
    pixels: source.thumbnail.getSize(),
    size: display.size,
  };
}

async function performCaptureDisplay(): Promise<{
  ok: boolean;
  id?: string;
  error?: string;
}> {
  try {
    const display = await chooseDisplay();
    if (!display) return { ok: false, error: "cancelled" };
    const shot = await captureDisplayPng(display);
    if (!shot) return { ok: false, error: "no_display" };
    return savePng(shot.bytes, "Screenshot");
  } catch (err) {
    log.warn("[pond] screenshot failed", err);
    return { ok: false, error: "capture_failed" };
  }
}

async function performCaptureArea(rect: {
  x: number;
  y: number;
  width: number;
  height: number;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  try {
    const bounds = captureWindowBounds();
    if (!bounds || captureWindowLibraryRoot() !== libraryRoot()) {
      closeCaptureWindow();
      return { ok: false, error: "capture_expired" };
    }
    const display = screen.getDisplayMatching(bounds);
    closeCaptureWindow();
    await new Promise((resolve) => setTimeout(resolve, 120));
    const shot = await captureDisplayPng(display);
    if (!shot) return { ok: false, error: "no_display" };
    const crop = cropRectangle(rect, shot.size, shot.pixels);
    const cropped = await sharp(shot.bytes).extract(crop).png().toBuffer();
    return savePng(cropped, "Screenshot");
  } catch (err) {
    log.warn("[pond] area screenshot failed", err);
    return { ok: false, error: "capture_failed" };
  }
}

async function performCaptureWindow(): Promise<{
  ok: boolean;
  id?: string;
  error?: string;
}> {
  try {
    const sources = await desktopCapturer.getSources({
      types: ["window"],
      thumbnailSize: { width: 2560, height: 1440 },
    });
    const source = await chooseWindow(sources);
    if (!source) return { ok: false, error: "no_window" };
    return savePng(source.thumbnail.toPNG(), source.name || "Screenshot");
  } catch (err) {
    log.warn("[pond] window screenshot failed", err);
    return { ok: false, error: "capture_failed" };
  }
}

export function captureDisplay() {
  return runLibraryTransfer(performCaptureDisplay);
}
export function captureWindow() {
  return runLibraryTransfer(performCaptureWindow);
}
export function captureArea(rect: Parameters<typeof performCaptureArea>[0]) {
  return runLibraryTransfer(() => performCaptureArea(rect));
}
