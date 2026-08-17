import { spawn } from "node:child_process";
import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import log from "electron-log/main.js";
import { binariesAvailable } from "../core/refresh/binaries";

const HARD_TIMEOUT_MS = 10_000;

interface ExtractedFrame {
  path: string;
  mimeType: string;
  size: number;
  cleanup: () => Promise<void>;
}

export async function extractFirstFrame(
  videoPath: string,
): Promise<ExtractedFrame | null> {
  return extractJpeg(videoPath, (outPath) =>
    jpegArgv(videoPath, outPath, ["before", "0"]),
  );
}

/** `-ss` after `-i` so the grab matches the player's currentTime, not the prior keyframe. */
export async function extractFrameAt(
  videoPath: string,
  timeSec: number,
): Promise<ExtractedFrame | null> {
  const seek = Math.max(0, Number.isFinite(timeSec) ? timeSec : 0);
  return extractJpeg(videoPath, (outPath) =>
    jpegArgv(videoPath, outPath, ["after", String(seek)]),
  );
}

function jpegArgv(
  videoPath: string,
  outPath: string,
  seek: ["before" | "after", string],
): string[] {
  const head =
    seek[0] === "before"
      ? ["-ss", seek[1], "-i", videoPath]
      : ["-i", videoPath, "-ss", seek[1]];
  return [
    "-hide_banner",
    "-loglevel",
    "error",
    "-y",
    ...head,
    "-frames:v",
    "1",
    "-q:v",
    "3",
    "-f",
    "image2",
    outPath,
  ];
}

async function extractJpeg(
  videoPath: string,
  argvFor: (outPath: string) => string[],
): Promise<ExtractedFrame | null> {
  const { ffmpeg } = binariesAvailable();
  if (!ffmpeg) {
    log.debug("[pond ffmpeg-frame] binary unavailable, skipping", videoPath);
    return null;
  }

  let outputDir: string | null = null;
  let cleanupCalled = false;
  const cleanup = async () => {
    if (cleanupCalled) return;
    cleanupCalled = true;
    if (outputDir) {
      try {
        await rm(outputDir, { recursive: true, force: true });
      } catch (err) {
        log.warn("[pond ffmpeg-frame] tmpdir cleanup failed", outputDir, err);
      }
    }
  };

  try {
    outputDir = await mkdtemp(join(tmpdir(), "pond-frame-"));
    const outPath = join(outputDir, "frame.jpg");
    const { code, stderr } = await runWithTimeout(
      ffmpeg,
      argvFor(outPath),
      HARD_TIMEOUT_MS,
    );
    if (code !== 0) {
      log.warn(
        "[pond ffmpeg-frame] non-zero exit",
        code,
        videoPath,
        stderr.slice(-400),
      );
      await cleanup();
      return null;
    }

    let size = 0;
    try {
      const s = await stat(outPath);
      size = s.size;
    } catch {
      await cleanup();
      return null;
    }
    if (size === 0) {
      log.warn("[pond ffmpeg-frame] produced empty file", videoPath);
      await cleanup();
      return null;
    }

    return {
      path: outPath,
      mimeType: "image/jpeg",
      size,
      cleanup,
    };
  } catch (err) {
    log.warn("[pond ffmpeg-frame] unexpected error", videoPath, err);
    await cleanup();
    return null;
  }
}

interface ProcOutcome {
  code: number;
  stderr: string;
}

function runWithTimeout(
  bin: string,
  argv: string[],
  timeoutMs: number,
): Promise<ProcOutcome> {
  return new Promise((resolve) => {
    const child = spawn(bin, argv, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      try {
        child.kill("SIGKILL");
      } catch {
        /* already exited */
      }
      resolve({ code: 124, stderr: `${stderr}\n[pond ffmpeg-frame] timeout` });
    }, timeoutMs);

    child.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
      if (stderr.length > 32_000) stderr = stderr.slice(-32_000);
    });
    child.on("error", (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ code: -1, stderr: String(err) });
    });
    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ code: code ?? -1, stderr });
    });
  });
}
