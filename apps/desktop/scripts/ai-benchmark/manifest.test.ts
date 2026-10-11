import type { JsonValue } from "@pond/schema/json";
import { describe, expect, test } from "vitest";
import { evaluateCorpusEligibility, parseBenchmarkManifest } from "./manifest";

const vision = {
  id: "receipt-001",
  kind: "vision" as const,
  path: "/private/corpus/receipt.png",
  slices: ["receipt", "small-text"],
  ocrReference: "TOTAL 12.50",
  mustMention: ["receipt"],
  forbiddenClaims: ["restaurant name"],
};

const audio = {
  id: "meeting-001",
  kind: "audio" as const,
  path: "/private/corpus/meeting.wav",
  slices: ["five-minute", "boundary-name"],
  durationMs: 300_000,
  transcriptReference: "Welcome to the Pond planning meeting.",
};

const invalidItems: Array<{ name: string; value: JsonValue }> = [
  {
    name: "relative paths",
    value: { ...vision, path: "private/corpus/receipt.png" },
  },
  {
    name: "vision rows without a scored task reference",
    value: {
      id: "unscored-vision",
      kind: "vision",
      path: "/private/corpus/photo.png",
      slices: ["photo"],
    },
  },
  {
    name: "audio rows without transcripts",
    value: {
      id: "unscored-audio",
      kind: "audio",
      path: "/private/corpus/audio.wav",
      slices: ["short"],
      durationMs: 1_000,
    },
  },
  {
    name: "runner-owned hashes",
    value: { ...vision, sourceHash: "do-not-copy-this" },
  },
  {
    name: "unknown fields",
    value: { ...vision, privateTranscriptPath: "/private/reference.txt" },
  },
];

describe("private media benchmark manifest", () => {
  test("parses strict vision and audio records without source hashes", () => {
    const manifest = parseBenchmarkManifest({
      version: 1,
      items: [vision, audio],
    });

    expect(manifest).toEqual({ version: 1, items: [vision, audio] });
    expect(manifest.items.every((item) => !("sourceHash" in item))).toBe(true);
  });

  test("accepts independent caption-only and OCR-only vision references", () => {
    const manifest = parseBenchmarkManifest({
      version: 1,
      items: [
        {
          id: "caption-001",
          kind: "vision",
          path: "/private/corpus/photo.jpg",
          slices: ["photo"],
          mustMention: ["red bicycle"],
          forbiddenClaims: [],
        },
        {
          id: "ocr-001",
          kind: "vision",
          path: "/private/corpus/document.png",
          slices: ["document"],
          ocrReference: "Invoice 1234",
        },
      ],
    });

    expect(manifest.items).toHaveLength(2);
  });

  test.each(invalidItems)("rejects $name", ({ value }) => {
    expect(() =>
      parseBenchmarkManifest({ version: 1, items: [value] }),
    ).toThrow();
  });

  test("rejects duplicate IDs across media kinds", () => {
    expect(() =>
      parseBenchmarkManifest({
        version: 1,
        items: [vision, { ...audio, id: vision.id }],
      }),
    ).toThrow(/unique/i);
  });
});

describe("corpus eligibility", () => {
  test("requires 200 vision items, caption and OCR coverage, and three audio hours", () => {
    const items = [
      ...Array.from({ length: 200 }, (_, index) => ({
        id: `vision-${index}`,
        kind: "vision" as const,
        path: `/private/corpus/vision-${index}.png`,
        slices: [index % 2 === 0 ? "caption" : "ocr"],
        ...(index % 2 === 0
          ? { mustMention: [`subject-${index}`] }
          : { ocrReference: `FIELD ${index}` }),
      })),
      {
        id: "audio-three-hours",
        kind: "audio" as const,
        path: "/private/corpus/audio-three-hours.wav",
        slices: ["long-form"],
        durationMs: 3 * 60 * 60 * 1_000,
        transcriptReference: "Synthetic benchmark transcript.",
      },
    ];
    const manifest = parseBenchmarkManifest({ version: 1, items });

    expect(evaluateCorpusEligibility(manifest, { mode: "decision" })).toEqual({
      mode: "decision",
      decisionEligible: true,
      counts: {
        audioDurationMs: 10_800_000,
        audioItems: 1,
        captionItems: 100,
        ocrItems: 100,
        visionItems: 200,
      },
      shortfalls: [],
    });
  });

  test("allows smoke corpora but reports every decision shortfall", () => {
    const manifest = parseBenchmarkManifest({
      version: 1,
      items: [vision, audio],
    });

    expect(evaluateCorpusEligibility(manifest, { mode: "smoke" })).toEqual({
      mode: "smoke",
      decisionEligible: false,
      counts: {
        audioDurationMs: 300_000,
        audioItems: 1,
        captionItems: 1,
        ocrItems: 1,
        visionItems: 1,
      },
      shortfalls: [
        {
          actual: 1,
          criterion: "vision-items",
          required: 200,
          unit: "items",
        },
        {
          actual: 300_000,
          criterion: "audio-duration",
          required: 10_800_000,
          unit: "milliseconds",
        },
      ],
    });
  });

  test("requires caption and OCR coverage without requiring both on every row", () => {
    const manifest = parseBenchmarkManifest({
      version: 1,
      items: Array.from({ length: 200 }, (_, index) => ({
        id: `ocr-${index}`,
        kind: "vision" as const,
        path: `/private/corpus/ocr-${index}.png`,
        slices: ["ocr"],
        ocrReference: `FIELD ${index}`,
      })),
    });

    expect(
      evaluateCorpusEligibility(manifest, { mode: "decision" }).shortfalls,
    ).toContainEqual({
      actual: 0,
      criterion: "caption-coverage",
      required: 1,
      unit: "items",
    });
  });
});
