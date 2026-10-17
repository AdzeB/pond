import { describe, expect, it } from "vitest";
import { settleInstagramLikesFailure } from "./harvest-list";

const pageError = {
  ok: false,
  reason: "page_error",
  error: "TypeError: Failed to fetch",
} as const;

describe("settleInstagramLikesFailure", () => {
  it("keeps the likes read before a page exception", async () => {
    const partial = [
      {
        sourceId: "DeEvTWUNxvZ",
        url: "https://www.instagram.com/p/DeEvTWUNxvZ/",
      },
    ];
    await expect(
      settleInstagramLikesFailure(pageError, async () => partial),
    ).resolves.toEqual({ ok: true, entries: partial, reachedEnd: false });
  });

  it("reports the page exception when nothing was read", async () => {
    await expect(
      settleInstagramLikesFailure(pageError, async () => null),
    ).resolves.toEqual(pageError);
  });

  it("does not recover entries for other failures", async () => {
    const partial = [
      {
        sourceId: "DeEvTWUNxvZ",
        url: "https://www.instagram.com/p/DeEvTWUNxvZ/",
      },
    ];
    await expect(
      settleInstagramLikesFailure(
        { ok: false, reason: "auth_required" },
        async () => partial,
      ),
    ).resolves.toEqual({ ok: false, reason: "auth_required" });
  });
});
