import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { EXTENSION_KEY } from "@pond/schema/native";
import { app, shell } from "electron";
import JSZip from "jszip";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { extensionZipUrl, installBrowserExtension } from "./browser-extension";

async function extensionZip(): Promise<ArrayBuffer> {
  const zip = new JSZip();
  zip.file("manifest.json", JSON.stringify({ name: "Pond" }));
  zip.file("content-scripts/overlay.js", "");
  zip.file("../escape.js", "");
  return await zip.generateAsync({ type: "arraybuffer" });
}

describe("installBrowserExtension", () => {
  let root: string;
  let downloads: string;
  const showItemInFolder = vi.fn();
  const fetchMock = vi.fn();

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "pond-extension-"));
    downloads = join(root, "Downloads");
    mkdirSync(downloads);
    Object.assign(app, {
      getPath: () => downloads,
      getVersion: () => "1.4.0",
    });
    Object.assign(shell, { showItemInFolder });
    showItemInFolder.mockClear();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    rmSync(root, { recursive: true, force: true });
  });

  it("downloads the release zip for this version", () => {
    expect(extensionZipUrl("chrome", "1.4.0")).toBe(
      "https://github.com/raphaelsalaja/pond/releases/download/v1.4.0/pond-extension-1.4.0-chrome.zip",
    );
  });

  it("unpacks the Chrome zip into Downloads with the pinned key and reveals it", async () => {
    fetchMock.mockResolvedValue(new Response(await extensionZip()));
    const target = join(downloads, "Pond Extension");
    mkdirSync(target);
    writeFileSync(join(target, "stale.js"), "");

    await expect(installBrowserExtension()).resolves.toEqual({
      ok: true,
      path: target,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      extensionZipUrl("chrome", "1.4.0"),
      expect.anything(),
    );
    const manifest = JSON.parse(
      readFileSync(join(target, "manifest.json"), "utf8"),
    );
    expect(manifest).toEqual({ name: "Pond", key: EXTENSION_KEY });
    expect(existsSync(join(target, "content-scripts", "overlay.js"))).toBe(
      true,
    );
    expect(existsSync(join(target, "stale.js"))).toBe(false);
    expect(existsSync(join(downloads, "escape.js"))).toBe(false);
    expect(showItemInFolder).toHaveBeenCalledWith(target);
  });

  it("leaves the Firefox manifest alone", async () => {
    fetchMock.mockResolvedValue(new Response(await extensionZip()));
    const target = join(downloads, "Pond Extension Firefox");

    await expect(installBrowserExtension("firefox")).resolves.toEqual({
      ok: true,
      path: target,
    });
    expect(
      JSON.parse(readFileSync(join(target, "manifest.json"), "utf8")),
    ).toEqual({ name: "Pond" });
  });

  it("keeps the existing Downloads copy when the download fails", async () => {
    fetchMock.mockResolvedValue(new Response("Not Found", { status: 404 }));
    const target = join(downloads, "Pond Extension");
    mkdirSync(target);
    writeFileSync(join(target, "manifest.json"), "{}");

    const result = await installBrowserExtension();
    expect(result.ok).toBe(false);
    expect(existsSync(join(target, "manifest.json"))).toBe(true);
    expect(showItemInFolder).not.toHaveBeenCalled();
  });
});
