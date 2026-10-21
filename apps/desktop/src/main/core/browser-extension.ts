import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve, sep } from "node:path";
import { EXTENSION_KEY } from "@pond/schema/native";
import { app, shell } from "electron";
import log from "electron-log/main.js";
import type { ExtensionBrowser } from "../../shared/browser-extension-contracts";
import type { QueryResult } from "../../shared/query-contracts";

const REPO = "raphaelsalaja/pond";
const DOWNLOAD_TIMEOUT_MS = 60_000;

const FOLDERS = {
  chrome: "Pond Extension",
  firefox: "Pond Extension Firefox",
} satisfies Record<ExtensionBrowser, string>;

/** The release that shipped this copy of Pond, so the extension matches its native host. */
export function extensionZipUrl(
  browser: ExtensionBrowser,
  version: string,
): string {
  return `https://github.com/${REPO}/releases/download/v${version}/pond-extension-${version}-${browser}.zip`;
}

async function fetchZip(url: string): Promise<ArrayBuffer> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      redirect: "follow",
      headers: { "user-agent": "pond-desktop" },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return await res.arrayBuffer();
  } finally {
    clearTimeout(timer);
  }
}

async function unpack(zip: ArrayBuffer, destination: string): Promise<void> {
  const { default: JSZip } = await import("jszip");
  const archive = await JSZip.loadAsync(zip);
  const root = resolve(destination);
  await rm(root, { recursive: true, force: true });
  for (const entry of Object.values(archive.files)) {
    if (entry.dir) continue;
    const path = resolve(root, entry.name);
    if (!path.startsWith(root + sep)) continue;
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, await entry.async("nodebuffer"));
  }
}

/** Store zips omit `key`, so without it Chrome assigns a path-based ID the native host rejects. */
async function pinChromeId(destination: string): Promise<void> {
  const path = join(destination, "manifest.json");
  const manifest = JSON.parse(await readFile(path, "utf8"));
  await writeFile(
    path,
    JSON.stringify({ ...manifest, key: EXTENSION_KEY }, null, 2),
  );
}

/** Unpacked copies stay at one Downloads path so the browser can reload the same folder. */
export async function installBrowserExtension(
  browser: ExtensionBrowser = "chrome",
): Promise<QueryResult<"extension.install">> {
  const url = extensionZipUrl(browser, app.getVersion());
  let zip: ArrayBuffer;
  try {
    zip = await fetchZip(url);
  } catch (err) {
    log.warn("[pond extension] download failed", url, err);
    return {
      ok: false,
      error:
        "Pond couldn't download the extension from GitHub. Check your connection and try again.",
    };
  }
  const destination = join(app.getPath("downloads"), FOLDERS[browser]);
  try {
    await unpack(zip, destination);
    if (browser === "chrome") await pinChromeId(destination);
  } catch (err) {
    log.warn("[pond extension] unpack failed", err);
    return {
      ok: false,
      error: "Pond couldn't save the extension to Downloads. Try again.",
    };
  }
  shell.showItemInFolder(destination);
  return { ok: true, path: destination };
}
