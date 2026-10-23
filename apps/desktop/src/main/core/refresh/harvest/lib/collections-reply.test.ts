import { describe, expect, it } from "vitest";
import { buildTiktokListExpression, tiktokCollectionUrl } from "../tiktok";
import { readCollectionsReply } from "./collections-reply";

describe("readCollectionsReply", () => {
  it("names unnamed collections by id and keeps counts", () => {
    expect(
      readCollectionsReply({
        ok: true,
        collections: [
          { id: "7", name: "Recipes", count: 12 },
          { id: "8", name: "", count: null },
        ],
      }),
    ).toEqual({
      ok: true,
      collections: [
        { id: "7", name: "Recipes", itemCount: 12 },
        { id: "8", name: "8", itemCount: null },
      ],
    });
  });

  it("treats a malformed reply as unknown", () => {
    expect(readCollectionsReply("nope")).toEqual({
      ok: false,
      reason: "unknown",
      detail: "malformed reply",
    });
  });

  it("keeps the page's failure detail for the log", () => {
    expect(
      readCollectionsReply({
        ok: false,
        reason: "checkpoint",
        detail: "checkpoint_required",
      }),
    ).toEqual({
      ok: false,
      reason: "checkpoint",
      detail: "checkpoint_required",
    });
  });
});

describe("tiktokCollectionUrl", () => {
  it("encodes the handle and title around the id", () => {
    expect(tiktokCollectionUrl("me", { id: "7", name: "Fall recipes" })).toBe(
      "https://www.tiktok.com/@me/collection/Fall%20recipes-7",
    );
  });
});

describe("buildScrollListExpression", () => {
  it("drops known ids when a walk must read to the end", () => {
    const full = buildTiktokListExpression({
      knownIds: ["1"],
      earlyStop: false,
    });
    const incremental = buildTiktokListExpression({
      knownIds: ["1"],
      earlyStop: true,
    });
    expect(full).toContain('"knownIds":[]');
    expect(incremental).toContain('"knownIds":["1"]');
  });
});
