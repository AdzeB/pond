import { DEFAULT_PREFS } from "@pond/schema";
import { describe, expect, it } from "vitest";
import type { Save } from "@/features/saves/types";
import { SENSITIVE_CONTENT_MODEL_VERSION } from "../sensitive-content";
import { sensitiveContentEnricher } from "./sensitive-content";

function imageSave(sensitiveModel: string | null = null): Save {
  return {
    id: "save-1",
    source: "local",
    sourceId: "source-1",
    url: "",
    title: null,
    description: null,
    author: null,
    notes: null,
    mediaUrl: null,
    mediaType: "image",
    files: [
      {
        kind: "media",
        path: "image.jpg",
        sha256: "hash",
        size: 1,
        mimeType: "image/jpeg",
      },
    ],
    tags: [],
    status: "complete",
    sensitiveModel,
    savedAt: 1,
    createdAt: 1,
    deletedAt: null,
  };
}

describe("sensitive content enricher", () => {
  it("is eligible until the current policy version is stamped", () => {
    expect(sensitiveContentEnricher.eligible(imageSave())).toBe(true);
    expect(
      sensitiveContentEnricher.eligible(
        imageSave(SENSITIVE_CONTENT_MODEL_VERSION),
      ),
    ).toBe(false);
  });

  it("only runs when sensitive-content processing is enabled", () => {
    expect(
      sensitiveContentEnricher.enabled({
        ...DEFAULT_PREFS,
        ai: { ...DEFAULT_PREFS.ai, enableSensitiveContent: true },
      }),
    ).toBe(true);
    expect(sensitiveContentEnricher.enabled(null)).toBe(false);
  });
});
