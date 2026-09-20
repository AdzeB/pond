import type {
  DesktopScreenshotCrop,
  DesktopScreenshotSource,
} from "@shared/saves-import-contracts";
import sharp from "sharp";
import {
  createManualSave,
  type ManualSaveInput,
  type ManualSaveResult,
} from "./manual-import";

const PREVIEW_SIZE = { width: 360, height: 225 };
const CAPTURE_SIZE = { width: 7680, height: 4320 };

interface CapturedImage {
  getSize(): { width: number; height: number };
  isEmpty(): boolean;
  toDataURL(): string;
  toPNG(): Buffer;
}

interface CapturerSource {
  id: string;
  name: string;
  thumbnail: CapturedImage;
}

interface SourcesOptions {
  types: Array<"screen" | "window">;
  thumbnailSize: { width: number; height: number };
}

export interface DesktopScreenshotRuntime {
  getSources(options: SourcesOptions): Promise<CapturerSource[]>;
  save(input: ManualSaveInput): Promise<ManualSaveResult>;
  addToFolder(folderId: string, saveIds: string[]): Promise<{ ok: boolean }>;
  copyToClipboard?(bytes: Buffer): Promise<void>;
}

const desktopScreenshotRuntime: DesktopScreenshotRuntime = {
  async getSources(options) {
    const { desktopCapturer } = await import("electron");
    return desktopCapturer.getSources(options);
  },
  save: createManualSave,
  async addToFolder(folderId, saveIds) {
    const { addSavesToFolder } = await import("./folders");
    return addSavesToFolder(folderId, saveIds);
  },
  async copyToClipboard(bytes) {
    const { ClipboardItem, clipboard, nativeImage } = await import("electron");
    const image = nativeImage.createFromBuffer(bytes);
    await clipboard.write([
      new ClipboardItem({
        "image/png": new Blob([Uint8Array.from(image.toPNG())], {
          type: "image/png",
        }),
      }),
    ]);
  },
};

function sourceKind(id: string): "screen" | "window" | null {
  if (id.startsWith("screen:")) return "screen";
  if (id.startsWith("window:")) return "window";
  return null;
}

export async function listDesktopScreenshotSources(
  runtime: DesktopScreenshotRuntime = desktopScreenshotRuntime,
): Promise<DesktopScreenshotSource[]> {
  const sources = await runtime.getSources({
    types: ["screen", "window"],
    thumbnailSize: PREVIEW_SIZE,
  });
  return sources.flatMap((source) => {
    const kind = sourceKind(source.id);
    if (!kind || source.thumbnail.isEmpty()) return [];
    return [
      {
        id: source.id,
        name: source.name,
        kind,
        thumbnailDataUrl: source.thumbnail.toDataURL(),
      },
    ];
  });
}

export async function captureDesktopScreenshot(
  input: {
    sourceId: string;
    folderId?: string | null;
    title?: string | null;
    notes?: string | null;
    tags?: string[];
    rating?: number;
    format?: "png" | "jpeg" | "webp";
    quality?: number;
    crop?: DesktopScreenshotCrop | null;
    copyToClipboard?: boolean;
  },
  runtime: DesktopScreenshotRuntime = desktopScreenshotRuntime,
): Promise<{
  ok: boolean;
  id?: string;
  error?: "source_not_found" | "capture_unavailable" | "save_failed";
}> {
  const kind = sourceKind(input.sourceId);
  if (!kind) return { ok: false, error: "source_not_found" };
  const sources = await runtime.getSources({
    types: [kind],
    thumbnailSize: CAPTURE_SIZE,
  });
  const source = sources.find((candidate) => candidate.id === input.sourceId);
  if (!source) return { ok: false, error: "source_not_found" };
  if (source.thumbnail.isEmpty()) {
    return { ok: false, error: "capture_unavailable" };
  }
  const raw = source.thumbnail.toPNG();
  const size = source.thumbnail.getSize();
  if (raw.byteLength === 0 || size.width <= 0 || size.height <= 0) {
    return { ok: false, error: "capture_unavailable" };
  }
  const crop = normalizedCrop(input.crop, size);
  const format = input.format ?? "png";
  const quality = Math.min(100, Math.max(1, input.quality ?? 90));
  let bytes = raw;
  let outputSize = size;
  if (crop || format !== "png") {
    let image = sharp(raw);
    if (crop) image = image.extract(crop);
    bytes =
      format === "jpeg"
        ? await image.jpeg({ quality }).toBuffer()
        : format === "webp"
          ? await image.webp({ quality }).toBuffer()
          : await image.png().toBuffer();
    const metadata = await sharp(bytes).metadata();
    outputSize = {
      width: metadata.width ?? size.width,
      height: metadata.height ?? size.height,
    };
  }
  const extension = format === "jpeg" ? "jpg" : format;
  const created = await runtime.save({
    title: input.title?.trim() || `Screenshot: ${source.name}`,
    note: input.notes,
    tags: input.tags,
    rating: input.rating,
    memoryFiles: [
      {
        bytes,
        filename: `Screenshot.${extension}`,
        mimeType: `image/${format}`,
      },
    ],
    width: outputSize.width,
    height: outputSize.height,
  });
  if (!created.ok || !created.id) {
    return { ok: false, error: "save_failed" };
  }
  if (input.folderId) {
    await runtime.addToFolder(input.folderId, [created.id]);
  }
  if (input.copyToClipboard) await runtime.copyToClipboard?.(bytes);
  return { ok: true, id: created.id };
}

function normalizedCrop(
  crop: DesktopScreenshotCrop | null | undefined,
  size: { width: number; height: number },
): { left: number; top: number; width: number; height: number } | null {
  if (!crop) return null;
  const left = Math.floor(Math.min(1, Math.max(0, crop.x)) * size.width);
  const top = Math.floor(Math.min(1, Math.max(0, crop.y)) * size.height);
  const right = Math.ceil(
    Math.min(1, Math.max(crop.x, crop.x + crop.width)) * size.width,
  );
  const bottom = Math.ceil(
    Math.min(1, Math.max(crop.y, crop.y + crop.height)) * size.height,
  );
  const width = right - left;
  const height = bottom - top;
  return width > 0 && height > 0 ? { left, top, width, height } : null;
}
