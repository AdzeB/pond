import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { z } from "zod";

const run = promisify(execFile);
const ProcessId = z.coerce.number().int().positive();

export async function screenshotOrigin(): Promise<number | null> {
  if (process.platform !== "darwin") return null;
  try {
    const { stdout } = await run(
      "/usr/bin/osascript",
      [
        "-l",
        "JavaScript",
        "-e",
        'ObjC.import("AppKit"); Number($.NSWorkspace.sharedWorkspace.frontmostApplication.processIdentifier);',
      ],
      { timeout: 2000 },
    );
    const pid = ProcessId.parse(stdout.trim());
    return pid === process.pid ? null : pid;
  } catch {
    return null;
  }
}

export async function restoreScreenshotOrigin(
  pid: number | null,
): Promise<void> {
  if (pid === null || process.platform !== "darwin") return;
  const target = ProcessId.parse(pid);
  await run(
    "/usr/bin/osascript",
    [
      "-l",
      "JavaScript",
      "-e",
      `ObjC.import("AppKit"); const target = $.NSRunningApplication.runningApplicationWithProcessIdentifier(${target}); if (target && !target.terminated) target.activateWithOptions(2);`,
    ],
    { timeout: 2000 },
  ).catch(() => {});
}
