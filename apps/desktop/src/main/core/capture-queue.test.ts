import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { CaptureDraft } from "@pond/schema/capture";
import { afterEach, describe, expect, it } from "vitest";
import { type CaptureQueuePorts, createCaptureQueue } from "./capture-queue";

const roots: string[] = [];
afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});
const draft = (id = "capture-1"): CaptureDraft => ({
  id,
  mode: "quick",
  metadata: { tags: ["reference"], folderIds: [] },
  items: [
    { kind: "url", url: "https://example.com/one" },
    { kind: "url", url: "https://example.com/two" },
  ],
});
async function fixture(process: CaptureQueuePorts["process"]) {
  const root = await mkdtemp(join(tmpdir(), "pond-capture-test-"));
  roots.push(root);
  const ports: CaptureQueuePorts = {
    root: () => root,
    process,
    transfer: async (operation) => operation(),
  };
  return { root, ports, queue: createCaptureQueue(ports) };
}
describe("durable capture queue", () => {
  it("persists acceptance and resumes only the unfinished item after failure", async () => {
    const calls: string[] = [];
    let fail = true;
    const { root, ports, queue } = await fixture(
      async (_item, _meta, identity) => {
        calls.push(identity);
        if (identity.endsWith(":1") && fail) throw new Error("offline");
        return { id: identity };
      },
    );
    const accepted = await queue.accept(draft());
    expect(accepted.state).toBe("accepted");
    await queue.idle();
    expect((await queue.list())[0]).toMatchObject({
      state: "failed",
      completed: 1,
      error: "offline",
    });
    expect(
      JSON.parse(
        await readFile(join(root, ".capture-queue/capture-1.json"), "utf8"),
      ).library,
    ).toBe(root);
    fail = false;
    const restarted = createCaptureQueue(ports);
    await restarted.resume("capture-1");
    await restarted.idle();
    expect(calls).toEqual(["capture-1:0", "capture-1:1", "capture-1:1"]);
    expect((await restarted.list())[0]).toMatchObject({
      state: "complete",
      completed: 2,
    });
  });
  it("cancels after the active item and resumes only remaining captures", async () => {
    let release = () => {};
    let began = () => {};
    const started = new Promise<void>((resolve) => {
      began = resolve;
    });
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    const calls: string[] = [];
    const { queue } = await fixture(async (_item, _meta, id) => {
      calls.push(id);
      began();
      await pending;
      return { id };
    });
    await queue.accept(draft());
    await started;
    await queue.cancel("capture-1");
    release();
    await queue.idle();
    expect((await queue.list())[0]).toMatchObject({
      state: "cancelled",
      completed: 1,
    });
    await queue.resume("capture-1");
    await queue.idle();
    expect(calls).toEqual(["capture-1:0", "capture-1:1"]);
    expect((await queue.list())[0]?.state).toBe("complete");
  });
  it("keeps collect drafts pending until metadata is confirmed", async () => {
    const tags: string[][] = [];
    const { queue } = await fixture(async (_item, meta, id) => {
      tags.push(meta.tags);
      return { id };
    });
    await queue.accept({ ...draft(), mode: "collect" });
    await queue.idle();
    expect(tags).toEqual([]);
    await queue.resume("capture-1", {
      tags: ["chosen"],
      folderIds: ["folder"],
    });
    await queue.idle();
    expect(tags).toEqual([["chosen"], ["chosen"]]);
  });
  it("deduplicates a repeated accepted request and reports source duplicates", async () => {
    let calls = 0;
    const { queue } = await fixture(async () => {
      calls++;
      return { id: "existing", duplicate: true };
    });
    await queue.accept(draft());
    await queue.idle();
    await queue.accept(draft());
    await queue.idle();
    expect(calls).toBe(2);
    expect((await queue.list())[0]?.duplicateCount).toBe(2);
  });
  it("never processes accepted work in a different library", async () => {
    let calls = 0;
    const { root, ports, queue } = await fixture(async () => {
      calls++;
      return { id: "id" };
    });
    await queue.accept({ ...draft(), mode: "collect" });
    ports.root = () => `${root}-other`;
    await expect(queue.resume("capture-1")).rejects.toThrow();
    expect(calls).toBe(0);
    ports.root = () => root;
    await expect(queue.draft("../outside")).rejects.toThrow(
      "Invalid capture ID",
    );
  });
});
