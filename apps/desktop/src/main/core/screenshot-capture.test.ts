import { DEFAULT_PREFS } from "@pond/schema/db";
import sharp from "sharp";
import { describe, expect, it, vi } from "vitest";
import type { ManualSaveInput } from "./manual-import";
import { screenshotArguments } from "./native-screenshot";
import { createScreenshotCapture } from "./screenshot-capture";

async function fixture() {
  const bytes = await sharp({
    create: { width: 200, height: 100, channels: 3, background: "red" },
  })
    .png()
    .toBuffer();
  const state = {
    identity: "library-1",
    now: 1000,
    preferences: { ...DEFAULT_PREFS.screenshots },
  };
  const capture = vi.fn(
    async (): Promise<{ bytes: Buffer; scale: number } | null> => ({
      bytes,
      scale: 2,
    }),
  );
  const save = vi.fn(async (_input: ManualSaveInput) => ({
    ok: true,
    id: "screenshot-1",
  }));
  const addToFolder = vi.fn(async () => ({ ok: true }));
  const copy = vi.fn(async () => {});
  const notify = vi.fn(async () => {});
  const service = createScreenshotCapture({
    supported: () => true,
    identity: () => state.identity,
    preferences: async () => state.preferences,
    capture,
    save,
    addToFolder,
    copy,
    notify,
    now: () => state.now,
  });
  return { state, service, capture, save, addToFolder, copy, notify };
}

describe("screenshot preferences and capture", () => {
  it.each(["png", "jpeg", "webp"] as const)(
    "saves actual %s image bytes with the matching extension",
    async (format) => {
      const f = await fixture();
      f.state.preferences.format = format;
      await f.service.begin("area");
      const file = f.save.mock.calls[0]?.[0].memoryFiles?.[0];
      if (!file) throw new Error("Screenshot file was not saved");
      expect((await sharp(file.bytes).metadata()).format).toBe(format);
      expect(file.filename).toBe(
        `Screenshot.${format === "jpeg" ? "jpg" : format}`,
      );
    },
  );
  it("captures the requested mode with separate command arguments", () => {
    expect(screenshotArguments("area", "/tmp/a b.png", 1)).toEqual([
      "-x",
      "-i",
      "-o",
      "-t",
      "png",
      "/tmp/a b.png",
    ]);
    expect(screenshotArguments("window", "/tmp/a.png", 1)).toContain("-w");
    expect(screenshotArguments("screen", "/tmp/a.png", 2)).toContain("-D2");
  });
  it("converts format, scales Retina pixels, tags, copies, and notifies after saving", async () => {
    const f = await fixture();
    f.state.preferences = {
      ...f.state.preferences,
      format: "webp",
      useRetina: false,
      copyToClipboard: true,
    };
    await expect(f.service.begin("area")).resolves.toEqual({
      kind: "saved",
      id: "screenshot-1",
    });
    expect(f.capture).toHaveBeenCalledWith("area");
    expect(f.save).toHaveBeenCalledWith(
      expect.objectContaining({
        tags: ["Screenshot"],
        width: 100,
        height: 50,
        memoryFiles: [
          expect.objectContaining({
            filename: "Screenshot.webp",
            mimeType: "image/webp",
          }),
        ],
      }),
    );
    const copied = f.copy.mock.calls[0];
    expect(copied).toBeDefined();
    expect(f.notify).toHaveBeenCalledOnce();
  });
  it("does not save or notify when native capture is cancelled", async () => {
    const f = await fixture();
    f.capture.mockResolvedValue(null);
    await expect(f.service.begin("area")).resolves.toEqual({
      kind: "cancelled",
    });
    expect(f.save).not.toHaveBeenCalled();
    expect(f.notify).not.toHaveBeenCalled();
  });
  it("waits for organization and then saves the chosen metadata and folder once", async () => {
    const f = await fixture();
    f.state.preferences.askWhereToSave = true;
    const result = await f.service.begin("window");
    if (result.kind !== "draft")
      throw new Error("Expected a pending screenshot");
    expect(f.save).not.toHaveBeenCalled();
    await expect(f.service.begin("area")).rejects.toThrow(
      "Finish the current screenshot",
    );
    await f.service.finish({
      token: result.draft.token,
      title: "Reference",
      tags: ["Design"],
      folderId: "folder-1",
    });
    expect(f.save).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Reference", tags: ["Design"] }),
    );
    expect(f.addToFolder).toHaveBeenCalledWith("folder-1", ["screenshot-1"]);
    await expect(
      f.service.finish({ token: result.draft.token }),
    ).rejects.toThrow("expired");
  });
  it("rejects a draft after a Library switch and supports discarding it", async () => {
    const f = await fixture();
    f.state.preferences.askWhereToSave = true;
    const result = await f.service.begin("area");
    if (result.kind !== "draft")
      throw new Error("Expected a pending screenshot");
    f.state.identity = "library-2";
    await expect(
      f.service.finish({ token: result.draft.token }),
    ).rejects.toThrow("Library changed");
    expect(f.save).not.toHaveBeenCalled();
    const next = await f.service.begin("area");
    if (next.kind !== "draft") throw new Error("Expected a pending screenshot");
    f.service.discard(next.draft.token);
    await expect(f.service.finish({ token: next.draft.token })).rejects.toThrow(
      "expired",
    );
  });
  it("retries folder placement without creating a second screenshot", async () => {
    const f = await fixture();
    f.state.preferences.askWhereToSave = true;
    const result = await f.service.begin("area");
    if (result.kind !== "draft")
      throw new Error("Expected a pending screenshot");
    f.addToFolder.mockResolvedValueOnce({ ok: false });
    await expect(
      f.service.finish({ token: result.draft.token, folderId: "missing" }),
    ).rejects.toThrow("Choose another folder");
    await expect(
      f.service.finish({ token: result.draft.token, folderId: "folder-1" }),
    ).resolves.toEqual({ id: "screenshot-1" });
    expect(f.save).toHaveBeenCalledOnce();
  });
  it("clears stale drafts when a different Library starts a capture", async () => {
    const f = await fixture();
    f.state.preferences.askWhereToSave = true;
    await f.service.begin("area");
    f.state.identity = "library-2";
    await expect(f.service.begin("area")).resolves.toMatchObject({
      kind: "draft",
    });
  });
  it("propagates capture failures and allows another attempt", async () => {
    const f = await fixture();
    f.capture.mockRejectedValueOnce(new Error("Screen access denied"));
    await expect(f.service.begin("area")).rejects.toThrow(
      "Screen access denied",
    );
    expect(f.save).not.toHaveBeenCalled();
    await expect(f.service.begin("area")).resolves.toMatchObject({
      kind: "saved",
    });
  });
  it("saves full-screen captures directly and respects disabled tagging", async () => {
    const f = await fixture();
    f.state.preferences = {
      ...f.state.preferences,
      askWhereToSave: true,
      autoTag: false,
    };
    await expect(f.service.begin("screen")).resolves.toEqual({
      kind: "saved",
      id: "screenshot-1",
    });
    expect(f.save).toHaveBeenCalledWith(expect.objectContaining({ tags: [] }));
    expect(f.copy).not.toHaveBeenCalled();
  });
});
