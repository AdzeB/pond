import { describe, expect, test } from "vitest";
import {
  STITCH_TRANSCRIPT_POLICY,
  stitchTranscript,
} from "./stitch-transcript";

describe("transcript stitching", () => {
  test("drops an exact duplicated prefix and keeps the earlier surface text", () => {
    expect(
      stitchTranscript(["Launch at Nine tomorrow", "Nine tomorrow at HQ"], {
        expectedOverlapWords: 2,
      }),
    ).toEqual({
      text: "Launch at Nine tomorrow at HQ",
      diagnostics: {
        overlapWords: 2,
        droppedDuplicateWords: 2,
        unresolvedBoundaries: 0,
      },
    });
  });

  test("aligns case and punctuation differences without rewriting earlier words", () => {
    expect(
      stitchTranscript(["Hello, WORLD!", "world — again."], {
        expectedOverlapWords: 1,
      }),
    ).toEqual({
      text: "Hello, WORLD! — again.",
      diagnostics: {
        overlapWords: 1,
        droppedDuplicateWords: 1,
        unresolvedBoundaries: 0,
      },
    });
  });

  test("keeps an earlier boundary word that is missing from the later segment", () => {
    expect(
      stitchTranscript(["alpha beta gamma delta", "beta delta epsilon"], {
        expectedOverlapWords: 3,
      }),
    ).toEqual({
      text: "alpha beta gamma delta epsilon",
      diagnostics: {
        overlapWords: 2,
        droppedDuplicateWords: 2,
        unresolvedBoundaries: 0,
      },
    });
  });

  test("resolves repeated filler in favor of the earlier segment", () => {
    expect(
      stitchTranscript(
        ["We should um um review budget", "um review budget tomorrow"],
        { expectedOverlapWords: 3 },
      ),
    ).toEqual({
      text: "We should um um review budget tomorrow",
      diagnostics: {
        overlapWords: 3,
        droppedDuplicateWords: 3,
        unresolvedBoundaries: 0,
      },
    });
  });

  test("aligns code-switching text while retaining its original script and casing", () => {
    expect(
      stitchTranscript(
        ["We discussed mañana 東京", "Mañana 東京 plans continue"],
        { expectedOverlapWords: 2 },
      ),
    ).toEqual({
      text: "We discussed mañana 東京 plans continue",
      diagnostics: {
        overlapWords: 2,
        droppedDuplicateWords: 2,
        unresolvedBoundaries: 0,
      },
    });
  });

  test("marks one unresolved gap for an empty failed segment", () => {
    expect(
      stitchTranscript(["alpha beta", "", "beta gamma"], {
        expectedOverlapWords: 1,
      }),
    ).toEqual({
      text: "alpha beta [[UNRESOLVED AUDIO BOUNDARY]] beta gamma",
      diagnostics: {
        overlapWords: 0,
        droppedDuplicateWords: 0,
        unresolvedBoundaries: 1,
      },
    });
  });

  test("marks low-confidence boundaries instead of silently rewriting them", () => {
    expect(
      stitchTranscript(["alpha beta gamma", "alpha delta zeta"], {
        expectedOverlapWords: 3,
      }),
    ).toEqual({
      text: "alpha beta gamma [[UNRESOLVED AUDIO BOUNDARY]] alpha delta zeta",
      diagnostics: {
        overlapWords: 0,
        droppedDuplicateWords: 0,
        unresolvedBoundaries: 1,
      },
    });
    expect(STITCH_TRANSCRIPT_POLICY.minimumConfidence).toBe(0.6);
  });

  test("rejects configurations that exceed the fixed alignment-work bound", () => {
    expect(() =>
      stitchTranscript(["alpha", "alpha"], { expectedOverlapWords: 0 }),
    ).toThrow(/expected overlap/i);
    expect(() =>
      stitchTranscript(["alpha", "alpha"], {
        expectedOverlapWords: 2,
        maxAlignmentWords: 1,
      }),
    ).toThrow(/alignment window/i);
    expect(() =>
      stitchTranscript(["alpha", "alpha"], { maxAlignmentWords: 97 }),
    ).toThrow(/alignment window/i);
  });
});
