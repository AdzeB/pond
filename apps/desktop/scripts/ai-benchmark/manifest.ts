import { isAbsolute, posix, win32 } from "node:path";
import type { JsonValue } from "@pond/schema/json";
import { z } from "zod";

const MINIMUM_VISION_ITEMS = 200;
const MINIMUM_AUDIO_DURATION_MS = 3 * 60 * 60 * 1_000;

const nonEmptyText = z.string().trim().min(1);
const uniqueLabels = z
  .array(nonEmptyText)
  .min(1)
  .superRefine((values, context) => {
    if (new Set(values).size !== values.length) {
      context.addIssue({
        code: "custom",
        message: "Values must be unique.",
      });
    }
  });

const absolutePath = nonEmptyText.refine(
  (value) =>
    isAbsolute(value) || posix.isAbsolute(value) || win32.isAbsolute(value),
  "Benchmark media paths must be absolute.",
);

const visionManifestItemSchema = z
  .strictObject({
    id: nonEmptyText,
    kind: z.literal("vision"),
    path: absolutePath,
    slices: uniqueLabels,
    ocrReference: nonEmptyText.optional(),
    mustMention: z.array(nonEmptyText).min(1).optional(),
    forbiddenClaims: z.array(nonEmptyText).optional(),
  })
  .superRefine((item, context) => {
    if (item.ocrReference === undefined && item.mustMention === undefined) {
      context.addIssue({
        code: "custom",
        message:
          "Vision items require an OCR reference or caption must-mention facts.",
      });
    }
  });

const audioManifestItemSchema = z.strictObject({
  id: nonEmptyText,
  kind: z.literal("audio"),
  path: absolutePath,
  slices: uniqueLabels,
  durationMs: z.number().int().positive(),
  transcriptReference: nonEmptyText,
});

const benchmarkManifestItemSchema = z.discriminatedUnion("kind", [
  visionManifestItemSchema,
  audioManifestItemSchema,
]);

export const benchmarkManifestSchema = z
  .strictObject({
    version: z.literal(1),
    items: z.array(benchmarkManifestItemSchema).min(1),
  })
  .superRefine((manifest, context) => {
    const seen = new Set<string>();
    for (const [index, item] of manifest.items.entries()) {
      if (seen.has(item.id)) {
        context.addIssue({
          code: "custom",
          message: "Benchmark item IDs must be unique.",
          path: ["items", index, "id"],
        });
      }
      seen.add(item.id);
    }
  });

export type VisionManifestItem = z.infer<typeof visionManifestItemSchema>;
export type AudioManifestItem = z.infer<typeof audioManifestItemSchema>;
export type BenchmarkManifest = z.infer<typeof benchmarkManifestSchema>;
export type BenchmarkManifestInput = JsonValue;

export function parseBenchmarkManifest(
  input: BenchmarkManifestInput,
): BenchmarkManifest {
  return benchmarkManifestSchema.parse(input);
}

export type CorpusEligibilityMode = "decision" | "smoke";

export interface CorpusCounts {
  visionItems: number;
  captionItems: number;
  ocrItems: number;
  audioItems: number;
  audioDurationMs: number;
}

export type CorpusShortfall =
  | {
      criterion: "vision-items" | "caption-coverage" | "ocr-coverage";
      actual: number;
      required: number;
      unit: "items";
    }
  | {
      criterion: "audio-duration";
      actual: number;
      required: number;
      unit: "milliseconds";
    };

export interface CorpusEligibility {
  mode: CorpusEligibilityMode;
  decisionEligible: boolean;
  counts: CorpusCounts;
  shortfalls: CorpusShortfall[];
}

export function evaluateCorpusEligibility(
  manifest: BenchmarkManifest,
  options: { mode: CorpusEligibilityMode },
): CorpusEligibility {
  const visionItems = manifest.items.filter(
    (item): item is VisionManifestItem => item.kind === "vision",
  );
  const audioItems = manifest.items.filter(
    (item): item is AudioManifestItem => item.kind === "audio",
  );
  const counts: CorpusCounts = {
    visionItems: visionItems.length,
    captionItems: visionItems.filter(
      (item) => (item.mustMention?.length ?? 0) > 0,
    ).length,
    ocrItems: visionItems.filter((item) => item.ocrReference !== undefined)
      .length,
    audioItems: audioItems.length,
    audioDurationMs: audioItems.reduce(
      (duration, item) => duration + item.durationMs,
      0,
    ),
  };
  const shortfalls: CorpusShortfall[] = [];

  if (counts.visionItems < MINIMUM_VISION_ITEMS) {
    shortfalls.push({
      criterion: "vision-items",
      actual: counts.visionItems,
      required: MINIMUM_VISION_ITEMS,
      unit: "items",
    });
  }
  if (counts.audioDurationMs < MINIMUM_AUDIO_DURATION_MS) {
    shortfalls.push({
      criterion: "audio-duration",
      actual: counts.audioDurationMs,
      required: MINIMUM_AUDIO_DURATION_MS,
      unit: "milliseconds",
    });
  }
  if (counts.captionItems === 0) {
    shortfalls.push({
      criterion: "caption-coverage",
      actual: 0,
      required: 1,
      unit: "items",
    });
  }
  if (counts.ocrItems === 0) {
    shortfalls.push({
      criterion: "ocr-coverage",
      actual: 0,
      required: 1,
      unit: "items",
    });
  }

  return {
    mode: options.mode,
    decisionEligible: options.mode === "decision" && shortfalls.length === 0,
    counts,
    shortfalls,
  };
}
