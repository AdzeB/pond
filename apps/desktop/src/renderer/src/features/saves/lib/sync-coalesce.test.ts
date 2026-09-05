import { describe, expect, it } from "vitest";
import { pool } from "@/features/saves/state/pool";
import { applyActionCoalesced } from "./sync-coalesce";

const frame = () => new Promise((r) => setTimeout(r, 20));

describe("applyActionCoalesced", () => {
  it("ignores an update for a save it has never seen", async () => {
    applyActionCoalesced({
      modelName: "save",
      modelId: "unknown-1",
      action: "U",
      data: { status: "ingesting" },
    });
    await frame();
    expect(pool.get("unknown-1")).toBeUndefined();
  });

  it("keeps an update that carries the row's identity", async () => {
    applyActionCoalesced({
      modelName: "save",
      modelId: "known-1",
      action: "U",
      data: {
        id: "known-1",
        url: "https://x.com/a/status/1",
        status: "ingesting",
      },
    });
    await frame();
    expect(pool.get("known-1")?.url).toBe("https://x.com/a/status/1");
  });

  it("merges onto a save it already holds", async () => {
    applyActionCoalesced({
      modelName: "save",
      modelId: "known-2",
      action: "I",
      data: { id: "known-2", url: "https://x.com/b/status/2", title: "Two" },
    });
    await frame();
    applyActionCoalesced({
      modelName: "save",
      modelId: "known-2",
      action: "U",
      data: { status: "complete" },
    });
    await frame();
    expect(pool.get("known-2")?.title).toBe("Two");
    expect(pool.get("known-2")?.status).toBe("complete");
  });
});
