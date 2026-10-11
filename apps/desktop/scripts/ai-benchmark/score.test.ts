import { describe, expect, test } from "vitest";
import {
  aggregateBenchmarkScores,
  boundaryErrors,
  characterErrorRate,
  exactFieldMetrics,
  normalizeAsrText,
  normalizeSearchabilityText,
  scoreAsr,
  scoreOcr,
  wordErrorRate,
} from "./score";

describe("deterministic text error rates", () => {
  test("computes CER and WER with reference text as the denominator", () => {
    expect(characterErrorRate("TOTAL 12.50", "TOTAL 12.50")).toBe(0);
    expect(wordErrorRate("one two three", "one three")).toBeCloseTo(1 / 3);
  });

  test("defines empty-reference behavior without NaN or Infinity", () => {
    expect(characterErrorRate("", "")).toBe(0);
    expect(characterErrorRate("", "abc")).toBe(3);
    expect(wordErrorRate("", "one two")).toBe(2);
  });

  test("counts aligned omissions and duplications", () => {
    expect(boundaryErrors("alpha beta", "alpha alpha beta")).toEqual({
      duplications: 1,
      omissions: 0,
    });
    expect(boundaryErrors("alpha beta gamma", "alpha gamma")).toEqual({
      duplications: 0,
      omissions: 1,
    });
  });
});

describe("normalization profiles", () => {
  test("keeps OCR verbatim scoring separate from searchable text", () => {
    const result = scoreOcr("TOTAL: 12.50", "total 12 50", ["12.50"]);

    expect(result.raw.cer.rate).toBeGreaterThan(0);
    expect(result.searchability.cer.rate).toBe(0);
    expect(result.exactFields).toEqual({ matched: 0, total: 1, accuracy: 0 });
  });

  test("keeps punctuation-sensitive ASR separate from normalized ASR", () => {
    const result = scoreAsr("Hello, POND 42!", "hello pond 42", ["42"]);

    expect(result.punctuationSensitive.wer.rate).toBe(1);
    expect(result.normalized.wer.rate).toBe(0);
    expect(result.exactFields.accuracy).toBe(1);
  });

  test("case-folds and removes punctuation without spelling numbers out", () => {
    expect(normalizeSearchabilityText("Caf\u00e9 TOTAL: 12.50")).toBe(
      "caf\u00e9 total 12 50",
    );
    expect(normalizeAsrText("Room 101 -- ready.")).toBe("room 101 ready");
  });

  test("reports exact fields as not applicable when none are declared", () => {
    expect(exactFieldMetrics([], "anything")).toEqual({
      matched: 0,
      total: 0,
      accuracy: null,
    });
  });
});

describe("score aggregation", () => {
  test("weights sufficient statistics instead of averaging sample rates", () => {
    const first = scoreOcr("a", "", []);
    const second = scoreOcr("abcdefghi", "abcdefghij", []);

    const aggregate = aggregateBenchmarkScores([
      {
        hardware: "apple-silicon-16gb",
        id: "short",
        metrics: first.metrics,
        slices: ["receipt"],
      },
      {
        hardware: "apple-silicon-16gb",
        id: "long",
        metrics: second.metrics,
        slices: ["document"],
      },
    ]);

    expect(aggregate.overall.metrics["ocr.raw.cer"]).toEqual({
      denominator: 10,
      numerator: 2,
      value: 0.2,
    });
    expect(aggregate.bySlice.receipt?.metrics["ocr.raw.cer"]?.value).toBe(1);
    expect(aggregate.bySlice.document?.metrics["ocr.raw.cer"]?.value).toBe(
      1 / 9,
    );
    expect(aggregate.byHardware["apple-silicon-16gb"]?.sampleCount).toBe(2);
  });

  test("keeps slice and hardware cross-products visible", () => {
    const result = aggregateBenchmarkScores([
      {
        hardware: "windows-discrete-gpu",
        id: "receipt-windows",
        metrics: scoreOcr("TOTAL", "TOTAL", []).metrics,
        slices: ["receipt", "small-text"],
      },
    ]);

    expect(
      result.bySliceAndHardware.receipt?.["windows-discrete-gpu"]?.sampleIds,
    ).toEqual(["receipt-windows"]);
  });
});
