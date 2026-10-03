import { describe, expect, it, vi } from "vitest";
import { launchScreenshotTool, listScreenshotTools } from "./screenshot-tools";

const reader = {
  exists: () => true,
  entries: () => ["CleanShot X.app", "Shottr.app"],
};

describe("screenshot tools", () => {
  it("detects supported macOS screenshot applications", () => {
    expect(listScreenshotTools("darwin", reader)).toEqual([
      { id: "native", label: "macOS Screenshot", installed: true },
      { id: "cleanshot", label: "CleanShot X", installed: true },
      { id: "shottr", label: "Shottr", installed: true },
      { id: "pond", label: "Pond Capture", installed: true },
    ]);
  });

  it("uses documented local URL schemes for external tools", async () => {
    const openExternal = vi.fn(async () => {});
    const result = await launchScreenshotTool(
      "cleanshot",
      {
        platform: "darwin",
        openExternal,
        openApplication: vi.fn(async () => {}),
      },
      reader,
    );
    expect(result).toMatchObject({
      ok: true,
      used: "cleanshot",
      fallback: false,
      openPondCapture: false,
    });
    expect(openExternal).toHaveBeenCalledWith(
      "cleanshot://capture-area?action=save",
    );
  });

  it("falls back to native capture when a selected app is unavailable", async () => {
    const openApplication = vi.fn(async () => {});
    const result = await launchScreenshotTool(
      "shottr",
      {
        platform: "darwin",
        openExternal: vi.fn(async () => {}),
        openApplication,
      },
      { exists: () => true, entries: () => [] },
    );
    expect(result).toMatchObject({
      used: "native",
      fallback: true,
      openPondCapture: false,
    });
    expect(openApplication).toHaveBeenCalledWith("Screenshot");
  });
});
