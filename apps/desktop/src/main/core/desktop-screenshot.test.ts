import { describe, expect, it, vi } from "vitest";
import {
  captureDesktopScreenshot,
  type DesktopScreenshotRuntime,
  listDesktopScreenshotSources,
} from "./desktop-screenshot";

function image(
  bytes = Buffer.from("png"),
  size = { width: 1440, height: 900 },
) {
  return {
    getSize: () => size,
    isEmpty: () => bytes.byteLength === 0,
    toDataURL: () => "data:image/png;base64,cG5n",
    toPNG: () => bytes,
  };
}

function runtime(
  sources: Awaited<ReturnType<DesktopScreenshotRuntime["getSources"]>>,
) {
  const save = vi.fn(async () => ({ ok: true, id: "save-1" }));
  const addToFolder = vi.fn(async () => ({ ok: true }));
  const getSources = vi.fn(async () => sources);
  return { save, addToFolder, getSources };
}

describe("desktop screenshot capture", () => {
  it("lists only captureable screen and window sources", async () => {
    const dependencies = runtime([
      { id: "screen:1:0", name: "Entire Screen", thumbnail: image() },
      { id: "window:2:0", name: "Browser", thumbnail: image() },
      {
        id: "window:3:0",
        name: "Unavailable",
        thumbnail: image(Buffer.alloc(0)),
      },
      { id: "other:4:0", name: "Other", thumbnail: image() },
    ]);

    await expect(listDesktopScreenshotSources(dependencies)).resolves.toEqual([
      {
        id: "screen:1:0",
        name: "Entire Screen",
        kind: "screen",
        thumbnailDataUrl: "data:image/png;base64,cG5n",
      },
      {
        id: "window:2:0",
        name: "Browser",
        kind: "window",
        thumbnailDataUrl: "data:image/png;base64,cG5n",
      },
    ]);
    expect(dependencies.getSources).toHaveBeenCalledWith({
      types: ["screen", "window"],
      thumbnailSize: { width: 360, height: 225 },
    });
  });

  it("revalidates the selected source and saves PNG bytes through storage", async () => {
    const png = Buffer.from("captured png");
    const dependencies = runtime([
      {
        id: "window:8:0",
        name: "Design",
        thumbnail: image(png, { width: 2560, height: 1600 }),
      },
    ]);

    await expect(
      captureDesktopScreenshot(
        { sourceId: "window:8:0", folderId: "references" },
        dependencies,
      ),
    ).resolves.toEqual({ ok: true, id: "save-1" });
    expect(dependencies.getSources).toHaveBeenCalledWith({
      types: ["window"],
      thumbnailSize: { width: 7680, height: 4320 },
    });
    expect(dependencies.save).toHaveBeenCalledWith({
      title: "Screenshot: Design",
      memoryFiles: [
        {
          bytes: png,
          filename: "Screenshot.png",
          mimeType: "image/png",
        },
      ],
      width: 2560,
      height: 1600,
    });
    expect(dependencies.addToFolder).toHaveBeenCalledWith("references", [
      "save-1",
    ]);
  });

  it("rejects a source that is no longer available", async () => {
    const dependencies = runtime([]);
    await expect(
      captureDesktopScreenshot(
        { sourceId: "screen:9:0", folderId: null },
        dependencies,
      ),
    ).resolves.toEqual({ ok: false, error: "source_not_found" });
    expect(dependencies.save).not.toHaveBeenCalled();
  });
});
