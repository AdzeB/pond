import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const CUSTOM_ICON_FILE = "Icon\r";

export interface BundleHost {
  platform: NodeJS.Platform;
  packaged: boolean;
  exePath: string;
}

export function appBundlePath(host: BundleHost): string | null {
  if (host.platform !== "darwin" || !host.packaged) return null;
  return resolve(host.exePath, "../../..");
}

export function hasCustomBundleIcon(bundle: string): boolean {
  return existsSync(join(bundle, CUSTOM_ICON_FILE));
}

export async function setBundleIcon(
  bundle: string,
  imagePath: string | null,
): Promise<void> {
  if (imagePath == null && !hasCustomBundleIcon(bundle)) return;
  const image =
    imagePath == null
      ? "undefined"
      : `$.NSImage.alloc.initWithContentsOfFile(${JSON.stringify(imagePath)})`;
  const script = `ObjC.import("AppKit");
const workspace = $.NSWorkspace.sharedWorkspace;
const bundle = ${JSON.stringify(bundle)};
if (!workspace.setIconForFileOptions(${image}, bundle, 0)) throw new Error("setIcon failed");
workspace.noteFileSystemChanged(bundle);`;
  await execFileAsync(
    "/usr/bin/osascript",
    ["-l", "JavaScript", "-e", script],
    {
      timeout: 8000,
    },
  );
}
