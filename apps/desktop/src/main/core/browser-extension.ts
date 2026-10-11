import { existsSync } from "node:fs";
import { cp, rm } from "node:fs/promises";
import { join } from "node:path";
import { app, shell } from "electron";
import log from "electron-log/main.js";
import type { QueryResult } from "../../shared/query-contracts";

const FOLDER_NAME = "Pond Extension";

function bundledExtensionDir(): string | null {
  const candidates = app.isPackaged
    ? [join(process.resourcesPath, "extension")]
    : [join(app.getAppPath(), "..", "extension", ".output", "chrome-mv3")];
  return (
    candidates.find((dir) => existsSync(join(dir, "manifest.json"))) ?? null
  );
}

/** Chrome loads unpacked extensions by folder path, so the copy keeps one stable location for updates. */
export async function installBrowserExtension(): Promise<
  QueryResult<"extension.install">
> {
  const source = bundledExtensionDir();
  if (!source) {
    return {
      ok: false,
      error: app.isPackaged
        ? "This copy of Pond is missing the extension. Reinstall Pond and try again."
        : "Build the extension first, then try again.",
    };
  }
  const target = join(app.getPath("downloads"), FOLDER_NAME);
  try {
    await rm(target, { recursive: true, force: true });
    await cp(source, target, { recursive: true });
  } catch (err) {
    log.warn("[pond extension] copy failed", err);
    return {
      ok: false,
      error: "Pond couldn't save the extension to Downloads. Try again.",
    };
  }
  shell.showItemInFolder(target);
  return { ok: true, path: target };
}
