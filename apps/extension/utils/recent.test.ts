import { beforeEach, describe, expect, it } from "vitest";
import { fakeBrowser } from "wxt/testing/fake-browser";
import { readRecent, recordRecent, settleRecent } from "./recent";

function entry(id: string, at: number) {
  return {
    id,
    title: `Save ${id}`,
    url: `https://example.com/${id}`,
    kind: "page" as const,
    status: "sending" as const,
    at,
  };
}

describe("recent captures", () => {
  beforeEach(() => fakeBrowser.reset());

  it("records a capture and settles it in place", async () => {
    await recordRecent(entry("a", 1));
    await settleRecent({ status: "saved", id: "a", saveId: "s1" });
    expect(await readRecent()).toEqual([
      { ...entry("a", 1), status: "saved", saveId: "s1" },
    ]);
  });

  it("keeps the newest twelve", async () => {
    for (let i = 0; i < 14; i++) await recordRecent(entry(String(i), i));
    const recent = await readRecent();
    expect(recent).toHaveLength(12);
    expect(recent[0]?.id).toBe("13");
  });

  it("drops stored entries it can't read", async () => {
    await fakeBrowser.storage.local.set({
      recentCaptures: [entry("a", 1), { id: "broken" }],
    });
    expect((await readRecent()).map((item) => item.id)).toEqual(["a"]);
  });
});
