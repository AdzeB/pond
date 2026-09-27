import { randomUUID } from "node:crypto";
import type { Prefs } from "@pond/schema/db";
import sharp from "sharp";
import type {
  ScreenshotCaptureResult,
  ScreenshotDraft,
  ScreenshotMode,
  ScreenshotSaveInput,
} from "../../shared/screenshot-capture";
import { libraryRoot } from "../paths";
import { emitFeedback } from "./feedback";
import { addSavesToFolder } from "./folders";
import {
  createManualSave,
  type ManualSaveInput,
  type ManualSaveResult,
} from "./manual-import";
import { captureNativeScreenshot } from "./native-screenshot";
import { getPrefs } from "./prefs";

interface CapturePorts {
  supported(): boolean;
  identity(): string;
  preferences(): Promise<Prefs["screenshots"]>;
  capture(
    mode: ScreenshotMode,
  ): Promise<{ bytes: Buffer; scale: number } | null>;
  save(input: ManualSaveInput): Promise<ManualSaveResult>;
  addToFolder(folderId: string, ids: string[]): Promise<{ ok: boolean }>;
  copy(bytes: Buffer): Promise<void>;
  notify(): Promise<void>;
  now(): number;
}

interface PendingCapture {
  draft: ScreenshotDraft;
  bytes: Buffer;
  format: Prefs["screenshots"]["format"];
  identity: string;
  expires: number;
  savedId?: string;
}

export function createScreenshotCapture(ports: CapturePorts) {
  let pending: PendingCapture | null = null;
  let busy = false;
  let expiry: ReturnType<typeof setTimeout> | undefined;
  const clear = () => {
    pending = null;
    clearTimeout(expiry);
  };
  const assertLibrary = (identity: string) => {
    if (ports.identity() !== identity) {
      clear();
      throw new Error("The Library changed. Take the screenshot again.");
    }
  };
  const persist = async (
    capture: PendingCapture,
    input: Omit<ScreenshotSaveInput, "token">,
  ) => {
    assertLibrary(capture.identity);
    const extension = capture.format === "jpeg" ? "jpg" : capture.format;
    if (!capture.savedId) {
      const saved = await ports.save({
        title: input.title?.trim() || capture.draft.title,
        note: input.notes,
        tags: input.tags ?? capture.draft.tags,
        rating: input.rating,
        memoryFiles: [
          {
            bytes: capture.bytes,
            filename: `Screenshot.${extension}`,
            mimeType: `image/${capture.format}`,
          },
        ],
        width: capture.draft.width,
        height: capture.draft.height,
      });
      if (!saved.ok || !saved.id)
        throw new Error("Couldn't save the screenshot. Try again.");
      capture.savedId = saved.id;
    }
    assertLibrary(capture.identity);
    if (input.folderId) {
      const result = await ports.addToFolder(input.folderId, [capture.savedId]);
      if (!result.ok)
        throw new Error(
          "Couldn’t add the screenshot to that folder. Choose another folder and try again.",
        );
    }
    await ports.notify().catch(() => {});
    return capture.savedId;
  };
  return {
    async begin(mode: ScreenshotMode): Promise<ScreenshotCaptureResult> {
      if (!ports.supported()) return { kind: "unsupported" };
      if (
        pending &&
        (pending.identity !== ports.identity() ||
          pending.expires <= ports.now())
      )
        clear();
      if (busy || pending)
        throw new Error("Finish the current screenshot before taking another.");
      const identity = ports.identity();
      assertLibrary(identity);
      busy = true;
      try {
        const preferences = await ports.preferences();
        const captured = await ports.capture(mode);
        if (!captured) return { kind: "cancelled" };
        assertLibrary(identity);
        let image = sharp(captured.bytes);
        const source = await image.metadata();
        if (!source.width || !source.height)
          throw new Error("Couldn't read the screenshot. Try again.");
        if (!preferences.useRetina && captured.scale > 1) {
          image = image.resize({
            width: Math.max(1, Math.round(source.width / captured.scale)),
          });
        }
        const format = preferences.format;
        const bytes = await (format === "jpeg"
          ? image.jpeg({ quality: preferences.quality })
          : format === "webp"
            ? image.webp({ quality: preferences.quality })
            : image.png()
        ).toBuffer();
        const metadata = await sharp(bytes).metadata();
        const preview = await sharp(bytes)
          .resize({
            width: 640,
            height: 400,
            fit: "inside",
            withoutEnlargement: true,
          })
          .png()
          .toBuffer();
        assertLibrary(identity);
        if (preferences.copyToClipboard) await ports.copy(bytes);
        const draft: ScreenshotDraft = {
          token: randomUUID(),
          preview: `data:image/png;base64,${preview.toString("base64")}`,
          width: metadata.width ?? source.width,
          height: metadata.height ?? source.height,
          title: `Screenshot ${new Date(ports.now()).toISOString().replace("T", " ").slice(0, 19)}`,
          tags: preferences.autoTag ? ["Screenshot"] : [],
        };
        const capture = {
          draft,
          bytes,
          format,
          identity,
          expires: ports.now() + 600_000,
        };
        if (preferences.askWhereToSave && mode !== "screen") {
          pending = capture;
          expiry = setTimeout(clear, 600_000);
          expiry.unref();
          return { kind: "draft", draft };
        }
        const id = await persist(capture, {});
        return { kind: "saved", id };
      } finally {
        busy = false;
      }
    },
    async finish(input: ScreenshotSaveInput): Promise<{ id: string }> {
      if (busy) throw new Error("The screenshot is already being saved.");
      const capture = pending;
      if (
        !capture ||
        capture.draft.token !== input.token ||
        capture.expires <= ports.now()
      ) {
        throw new Error("This screenshot expired. Take it again.");
      }
      assertLibrary(capture.identity);
      busy = true;
      try {
        const id = await persist(capture, input);
        clear();
        return { id };
      } finally {
        busy = false;
      }
    },
    draft(): ScreenshotDraft | null {
      if (
        pending &&
        (pending.identity !== ports.identity() ||
          pending.expires <= ports.now())
      )
        clear();
      return pending?.draft ?? null;
    },
    isBusy(): boolean {
      return busy;
    },
    discard(token: string) {
      if (!busy && pending?.draft.token === token) clear();
    },
  };
}

export const screenshotCapture = createScreenshotCapture({
  supported: () => process.platform === "darwin",
  identity: libraryRoot,
  preferences: async () => (await getPrefs()).screenshots,
  capture: captureNativeScreenshot,
  save: createManualSave,
  addToFolder: addSavesToFolder,
  async copy(bytes) {
    const { ClipboardItem, clipboard, nativeImage } = await import("electron");
    const png = nativeImage.createFromBuffer(bytes).toPNG();
    await clipboard.write([
      new ClipboardItem({
        "image/png": new Blob([Uint8Array.from(png)], { type: "image/png" }),
      }),
    ]);
  },
  notify: () => emitFeedback("screenshot"),
  now: Date.now,
});
