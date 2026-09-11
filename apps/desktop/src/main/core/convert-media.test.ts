import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import ffmpegPath from "ffmpeg-static";
import sharp from "sharp";
import { expect, it } from "vitest";
import { ConversionPresetSchema } from "../../shared/conversion-contracts";
import { convertMedia } from "./convert-media";

it("resizes and converts copies with collision-safe names while preserving the original", async () => {
  const directory = await mkdtemp(join(tmpdir(), "pond-convert-test-"));
  try {
    const source = join(directory, "photo.png");
    await sharp({
      create: { width: 80, height: 40, channels: 3, background: "red" },
    })
      .png()
      .toFile(source);
    const original = await readFile(source);
    const preset = ConversionPresetSchema.parse({
      id: "web",
      name: "Web",
      format: "webp",
      width: 20,
    });
    const input = {
      source,
      directory,
      preset,
      signal: new AbortController().signal,
    };
    const first = await convertMedia(input);
    const second = await convertMedia(input);
    expect(first).not.toBe(second);
    const metadata = await sharp(first).metadata();
    expect(metadata.format).toBe("webp");
    expect(metadata.width).toBe(20);
    expect(metadata.height).toBe(10);
    expect(await readFile(source)).toEqual(original);
    const aborted = new AbortController();
    aborted.abort();
    await expect(
      convertMedia({ ...input, signal: aborted.signal }),
    ).rejects.toThrow();
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

it.skipIf(!ffmpegPath)(
  "converts a local video clip into a correctly sized animated GIF",
  async () => {
    const ffmpeg = ffmpegPath;
    if (!ffmpeg) throw new Error("FFmpeg unavailable");
    const directory = await mkdtemp(join(tmpdir(), "pond-gif-test-"));
    try {
      const source = join(directory, "clip.mp4");
      await promisify(execFile)(ffmpeg, [
        "-hide_banner",
        "-loglevel",
        "error",
        "-f",
        "lavfi",
        "-i",
        "testsrc=size=80x40:rate=10",
        "-t",
        "1",
        "-pix_fmt",
        "yuv420p",
        source,
      ]);
      const preset = ConversionPresetSchema.parse({
        id: "gif",
        name: "GIF",
        format: "gif",
        width: 40,
        duration: 0.5,
        fps: 10,
      });
      const output = await convertMedia({
        source,
        ffmpegPath: ffmpeg,
        directory,
        preset,
        signal: new AbortController().signal,
      });
      const metadata = await sharp(output, { animated: true }).metadata();
      expect(metadata.format).toBe("gif");
      expect(metadata.width).toBe(40);
      expect(metadata.pageHeight).toBe(20);
      expect(metadata.pages).toBe(5);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  },
);
