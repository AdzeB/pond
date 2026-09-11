import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, extname, join } from "node:path";
import sharp from "sharp";
import type { ConversionPreset } from "../../shared/conversion-contracts";
import { copyExportFile, writeExportFile } from "./export-files";
import { binariesAvailable } from "./refresh/binaries";

export async function convertMedia(input: {
  source: string;
  directory: string;
  preset: ConversionPreset;
  signal: AbortSignal;
  ffmpegPath?: string;
}): Promise<string> {
  const { source, directory, preset, signal } = input;
  signal.throwIfAborted();
  const stem = basename(source, extname(source));
  if (preset.format === "gif") {
    const ffmpeg = input.ffmpegPath ?? binariesAvailable().ffmpeg;
    if (!ffmpeg) throw new Error("FFmpeg is required to create a GIF.");
    const temporary = await mkdtemp(join(tmpdir(), "pond-convert-"));
    try {
      const output = join(temporary, "converted.gif");
      const width = preset.width ?? 640;
      const height = preset.height ?? -1;
      const filter = `fps=${preset.fps},scale=${width}:${height}:force_original_aspect_ratio=decrease:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse`;
      await new Promise<void>((resolve, reject) => {
        const process = spawn(
          ffmpeg,
          [
            "-nostdin",
            "-hide_banner",
            "-loglevel",
            "error",
            "-ss",
            String(preset.start),
            "-t",
            String(preset.duration),
            "-i",
            source,
            "-filter_complex",
            filter,
            "-loop",
            "0",
            output,
          ],
          { signal, stdio: ["ignore", "ignore", "pipe"] },
        );
        let error = "";
        process.stderr.on("data", (chunk: Buffer) => {
          error = `${error}${chunk.toString()}`.slice(-4000);
        });
        const timer = setTimeout(() => {
          process.kill("SIGKILL");
        }, 120_000);
        process.once("error", (cause) => {
          clearTimeout(timer);
          reject(cause);
        });
        process.once("close", (code) => {
          clearTimeout(timer);
          if (code === 0) resolve();
          else reject(new Error(error || "GIF conversion failed."));
        });
      });
      signal.throwIfAborted();
      return await copyExportFile(output, directory, `${stem}.gif`);
    } finally {
      await rm(temporary, { recursive: true, force: true });
    }
  }
  const image = sharp(source, { limitInputPixels: 100_000_000 }).rotate();
  const abort = () => image.destroy(new Error("Conversion cancelled."));
  signal.addEventListener("abort", abort, { once: true });
  try {
    if (preset.width || preset.height)
      image.resize({
        width: preset.width ?? undefined,
        height: preset.height ?? undefined,
        fit: "inside",
        withoutEnlargement: true,
      });
    const bytes = await image
      .toFormat(preset.format, { quality: preset.quality })
      .toBuffer();
    signal.throwIfAborted();
    return await writeExportFile(
      directory,
      `${stem}.${preset.format === "jpeg" ? "jpg" : preset.format}`,
      bytes,
    );
  } finally {
    signal.removeEventListener("abort", abort);
    image.destroy();
  }
}
