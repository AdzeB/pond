import { DEFAULT_PREFS } from "@pond/schema/db";
import sharp from "sharp";
import { expect, it, vi } from "vitest";
import { createScreenshotCapture } from "./screenshot-capture";
import { createScreenshotWorkflow } from "./screenshot-workflow";

async function fixture() {
  const bytes = await sharp({
    create: { width: 20, height: 10, channels: 3, background: "red" },
  })
    .png()
    .toBuffer();
  const state = {
    window: false,
    identity: "one",
    now: 1,
    ask: true,
    fail: false,
  };
  const captureNative = vi.fn(async () => ({ bytes, scale: 1 }));
  const save = vi.fn(async () => {
    if (state.fail) throw new Error("Disk full");
    return { ok: true, id: "saved" };
  });
  const capture = createScreenshotCapture({
    supported: () => true,
    identity: () => state.identity,
    preferences: async () => ({
      ...DEFAULT_PREFS.screenshots,
      askWhereToSave: state.ask,
    }),
    capture: captureNative,
    save,
    addToFolder: async () => ({ ok: true }),
    copy: async () => {},
    notify: async () => {},
    now: () => state.now,
  });
  const open = vi.fn(async () => {
    state.window = true;
  });
  const restore = vi.fn(async (_origin: number | null) => {});
  const afterSave = vi.fn(async (_id: string, _origin: number | null) => {});
  const workflow = createScreenshotWorkflow({
    capture,
    prepare: async () => 123,
    focus: () => state.window,
    open,
    destroy: () => {
      state.window = false;
    },
    restore,
    afterSave,
  });
  return {
    state,
    capture,
    workflow,
    captureNative,
    save,
    open,
    restore,
    afterSave,
  };
}

it("opens one organizer and focuses the existing draft without capturing again", async () => {
  const f = await fixture();
  expect(await f.workflow.begin("area")).toEqual({ kind: "organizing" });
  const token = f.capture.draft()?.token;
  expect(await f.workflow.begin("window")).toEqual({ kind: "organizing" });
  expect(f.captureNative).toHaveBeenCalledOnce();
  expect(f.capture.draft()?.token).toBe(token);
  expect(f.open).toHaveBeenCalledOnce();
  expect(f.afterSave).not.toHaveBeenCalled();
});
it("closes after successful save and delegates focus using the original application", async () => {
  const f = await fixture();
  await f.workflow.begin("area");
  const draft = f.capture.draft();
  if (!draft) throw new Error("Draft missing");
  f.state.fail = true;
  await expect(
    f.workflow.finish({ token: draft.token, notes: "Keep me" }),
  ).rejects.toThrow("Disk full");
  expect(f.capture.draft()).toEqual(draft);
  expect(f.afterSave).not.toHaveBeenCalled();
  f.state.fail = false;
  expect(
    await f.workflow.finish({ token: draft.token, notes: "Keep me" }),
  ).toEqual({ id: "saved" });
  expect(f.afterSave).not.toHaveBeenCalled();
  await f.workflow.close();
  expect(f.afterSave).toHaveBeenCalledWith("saved", 123);
  expect(f.restore).not.toHaveBeenCalled();
});
it("applies the same completion path to direct full-screen saves", async () => {
  const f = await fixture();
  expect(await f.workflow.begin("screen")).toEqual({
    kind: "saved",
    id: "saved",
  });
  expect(f.open).not.toHaveBeenCalled();
  expect(f.afterSave).toHaveBeenCalledWith("saved", 123);
});
it("cancellation discards bytes and restores the previous application", async () => {
  const f = await fixture();
  await f.workflow.begin("window");
  expect(await f.workflow.close()).toBe(true);
  expect(f.capture.draft()).toBeNull();
  expect(f.restore).toHaveBeenCalledWith(123);
  expect(f.save).not.toHaveBeenCalled();
});
it("failed window creation releases the pending capture for retry", async () => {
  const f = await fixture();
  f.open.mockRejectedValueOnce(new Error("Window failed"));
  await expect(f.workflow.begin("area")).rejects.toThrow("Window failed");
  expect(f.capture.draft()).toBeNull();
  expect(await f.workflow.begin("area")).toEqual({ kind: "organizing" });
});
it("library changes invalidate pending bytes and close the organizer", async () => {
  const f = await fixture();
  await f.workflow.begin("area");
  const draft = f.capture.draft();
  if (!draft) throw new Error("Draft missing");
  f.workflow.shutdown();
  f.state.identity = "two";
  expect(f.state.window).toBe(false);
  await expect(f.workflow.finish({ token: draft.token })).rejects.toThrow(
    "expired",
  );
  expect(f.save).not.toHaveBeenCalled();
});
it("expiry leaves no saveable pending capture", async () => {
  const f = await fixture();
  await f.workflow.begin("area");
  const draft = f.capture.draft();
  if (!draft) throw new Error("Draft missing");
  f.state.now += 600_001;
  expect(f.capture.draft()).toBeNull();
  await expect(f.workflow.finish({ token: draft.token })).rejects.toThrow(
    "expired",
  );
});

it("rejects native close during persistence without discarding the draft", async () => {
  const f = await fixture();
  await f.workflow.begin("area");
  const draft = f.capture.draft();
  if (!draft) throw new Error("Draft missing");
  const deferred = Promise.withResolvers<{ ok: boolean; id: string }>();
  f.save.mockImplementationOnce(() => deferred.promise);
  const saving = f.workflow.finish({ token: draft.token });
  expect(await f.workflow.close()).toBe(false);
  expect(f.capture.draft()?.token).toBe(draft.token);
  expect(f.restore).not.toHaveBeenCalled();
  deferred.resolve({ ok: true, id: "saved" });
  await saving;
  expect(await f.workflow.close()).toBe(true);
  expect(f.afterSave).toHaveBeenCalledOnce();
});

it("drops an in-flight capture when its Library closes", async () => {
  const f = await fixture();
  const deferred =
    Promise.withResolvers<Awaited<ReturnType<typeof f.captureNative>>>();
  const pixels = await f.captureNative();
  f.captureNative.mockImplementationOnce(() => deferred.promise);
  const capturing = f.workflow.begin("area");
  await vi.waitFor(() => expect(f.capture.isBusy()).toBe(true));
  f.workflow.shutdown();
  deferred.resolve(pixels);
  expect(await capturing).toEqual({ kind: "cancelled" });
  expect(f.capture.draft()).toBeNull();
  expect(f.open).not.toHaveBeenCalled();
  expect(f.save).not.toHaveBeenCalled();
});
