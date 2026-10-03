import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { z } from "zod";
import type { ScreenshotMode } from "../../shared/screenshot-capture";

const runFile = promisify(execFile);
const CancelledCommand = z.object({
  code: z.literal(1),
  stderr: z.string().optional(),
});
const FileError = z.object({ code: z.literal("ENOENT") });

export function screenshotArguments(
  mode: ScreenshotMode,
  path: string,
  display: number,
): string[] {
  const selection =
    mode === "area" ? ["-i"] : mode === "window" ? ["-w"] : [`-D${display}`];
  return ["-x", ...selection, "-o", "-t", "png", path];
}

export async function captureNativeScreenshot(
  mode: ScreenshotMode,
): Promise<{ bytes: Buffer; scale: number } | null> {
  const { screen, systemPreferences } = await import("electron");
  if (systemPreferences.getMediaAccessStatus("screen") === "denied") {
    throw new Error(
      "Allow Pond to record your screen in System Settings, then try again.",
    );
  }
  const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
  const displayIndex =
    screen.getAllDisplays().findIndex((entry) => entry.id === display.id) + 1;
  const directory = await mkdtemp(join(tmpdir(), "pond-screenshot-"));
  const path = join(directory, "capture.png");
  try {
    try {
      await runFile(
        "/usr/sbin/screencapture",
        screenshotArguments(mode, path, displayIndex),
        { timeout: 120_000 },
      );
    } catch (error) {
      const cancelled = CancelledCommand.safeParse(error);
      if (
        mode !== "screen" &&
        cancelled.success &&
        (!cancelled.data.stderr?.trim() ||
          /cancel/i.test(cancelled.data.stderr))
      )
        return null;
      throw error;
    }
    try {
      return { bytes: await readFile(path), scale: display.scaleFactor };
    } catch (error) {
      if (FileError.safeParse(error).success) return null;
      throw error;
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
