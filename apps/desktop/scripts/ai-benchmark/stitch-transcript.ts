export interface StitchDiagnostics {
  overlapWords: number;
  droppedDuplicateWords: number;
  unresolvedBoundaries: number;
}

export interface StitchTranscriptOptions {
  expectedOverlapWords?: number;
  maxAlignmentWords?: number;
}

export interface StitchedTranscript {
  text: string;
  diagnostics: StitchDiagnostics;
}

const UNRESOLVED_TRANSCRIPT_BOUNDARY = "[[UNRESOLVED AUDIO BOUNDARY]]";

export const STITCH_TRANSCRIPT_POLICY = Object.freeze({
  defaultExpectedOverlapWords: 10,
  /** Admits one omission in a three-word overlap; weaker alignments get an explicit marker. */
  minimumConfidence: 0.6,
  /** The suffix search performs fewer than maxAlignmentWords cubed cell visits. */
  maxAlignmentWords: 96,
});

interface SurfaceToken {
  normalized: string;
  end: number;
}

function tokenize(value: string): SurfaceToken[] {
  return Array.from(value.matchAll(/\S+/gu), (match) => {
    const text = match[0];
    return {
      normalized: text
        .normalize("NFKC")
        .toLowerCase()
        .replace(/[\p{P}\p{S}]+/gu, ""),
      end: (match.index ?? 0) + text.length,
    };
  }).filter((token) => token.normalized.length > 0);
}

interface AlignmentCandidate {
  suffixWords: number;
  prefixWords: number;
  editDistance: number;
  matchedWords: number;
  confidence: number;
  expectedDeviation: number;
}

function isBetterAlignment(
  candidate: AlignmentCandidate,
  current: AlignmentCandidate | undefined,
): boolean {
  if (current === undefined) return true;
  if (candidate.confidence !== current.confidence) {
    return candidate.confidence > current.confidence;
  }
  if (candidate.matchedWords !== current.matchedWords) {
    return candidate.matchedWords > current.matchedWords;
  }
  if (candidate.editDistance !== current.editDistance) {
    return candidate.editDistance < current.editDistance;
  }
  if (candidate.expectedDeviation !== current.expectedDeviation) {
    return candidate.expectedDeviation < current.expectedDeviation;
  }
  if (candidate.suffixWords !== current.suffixWords) {
    return candidate.suffixWords > current.suffixWords;
  }
  return candidate.prefixWords > current.prefixWords;
}

function findOverlap(
  earlier: readonly SurfaceToken[],
  later: readonly SurfaceToken[],
  expectedOverlapWords: number,
  maxAlignmentWords: number,
): AlignmentCandidate | undefined {
  const windowWords = Math.min(
    maxAlignmentWords,
    Math.max(8, expectedOverlapWords * 2),
  );
  const earlierWindow = earlier.slice(-windowWords);
  const laterWindow = later.slice(0, windowWords);
  let best: AlignmentCandidate | undefined;

  for (
    let suffixWords = 1;
    suffixWords <= earlierWindow.length;
    suffixWords++
  ) {
    const suffix = earlierWindow.slice(-suffixWords);
    let previous = Array.from(
      { length: laterWindow.length + 1 },
      (_, index) => index,
    );

    for (let suffixIndex = 1; suffixIndex <= suffix.length; suffixIndex++) {
      const current = [suffixIndex];
      for (
        let prefixIndex = 1;
        prefixIndex <= laterWindow.length;
        prefixIndex++
      ) {
        const substitutionCost =
          suffix[suffixIndex - 1]?.normalized ===
          laterWindow[prefixIndex - 1]?.normalized
            ? 0
            : 1;
        current[prefixIndex] = Math.min(
          (previous[prefixIndex] ?? 0) + 1,
          (current[prefixIndex - 1] ?? 0) + 1,
          (previous[prefixIndex - 1] ?? 0) + substitutionCost,
        );
      }
      previous = current;
    }

    for (
      let prefixWords = 1;
      prefixWords <= laterWindow.length;
      prefixWords++
    ) {
      const editDistance = previous[prefixWords] ?? Number.MAX_SAFE_INTEGER;
      const alignmentWords = Math.max(suffixWords, prefixWords);
      const matchedWords = Math.max(0, alignmentWords - editDistance);
      const similarity = matchedWords / alignmentWords;
      const coverage = Math.min(1, alignmentWords / expectedOverlapWords);
      const candidate: AlignmentCandidate = {
        suffixWords,
        prefixWords,
        editDistance,
        matchedWords,
        confidence: Math.min(similarity, coverage),
        expectedDeviation: Math.abs(alignmentWords - expectedOverlapWords),
      };
      if (isBetterAlignment(candidate, best)) best = candidate;
    }
  }

  if (
    best === undefined ||
    best.matchedWords === 0 ||
    best.confidence < STITCH_TRANSCRIPT_POLICY.minimumConfidence
  ) {
    return undefined;
  }
  return best;
}

export function stitchTranscript(
  segments: readonly string[],
  options: StitchTranscriptOptions = {},
): StitchedTranscript {
  const expectedOverlapWords =
    options.expectedOverlapWords ??
    STITCH_TRANSCRIPT_POLICY.defaultExpectedOverlapWords;
  const maxAlignmentWords =
    options.maxAlignmentWords ?? STITCH_TRANSCRIPT_POLICY.maxAlignmentWords;
  if (
    !Number.isSafeInteger(expectedOverlapWords) ||
    expectedOverlapWords <= 0 ||
    expectedOverlapWords > STITCH_TRANSCRIPT_POLICY.maxAlignmentWords
  ) {
    throw new RangeError(
      `Expected overlap must be an integer from 1 to ${STITCH_TRANSCRIPT_POLICY.maxAlignmentWords} words.`,
    );
  }
  if (
    !Number.isSafeInteger(maxAlignmentWords) ||
    maxAlignmentWords < expectedOverlapWords ||
    maxAlignmentWords > STITCH_TRANSCRIPT_POLICY.maxAlignmentWords
  ) {
    throw new RangeError(
      `Alignment window must be an integer from the expected overlap through ${STITCH_TRANSCRIPT_POLICY.maxAlignmentWords} words.`,
    );
  }
  const diagnostics: StitchDiagnostics = {
    overlapWords: 0,
    droppedDuplicateWords: 0,
    unresolvedBoundaries: 0,
  };
  let text = "";
  let previous = "";
  let pendingFailedSegment = false;

  for (const segment of segments) {
    const next = segment.trim();

    if (next.length === 0) {
      pendingFailedSegment = true;
      previous = "";
      continue;
    }
    if (text.length === 0) {
      if (pendingFailedSegment) {
        text = `${UNRESOLVED_TRANSCRIPT_BOUNDARY} ${next}`;
        diagnostics.unresolvedBoundaries += 1;
        pendingFailedSegment = false;
      } else {
        text = next;
      }
      previous = next;
      continue;
    }
    if (pendingFailedSegment) {
      text = `${text} ${UNRESOLVED_TRANSCRIPT_BOUNDARY} ${next}`;
      diagnostics.unresolvedBoundaries += 1;
      pendingFailedSegment = false;
      previous = next;
      continue;
    }

    const earlierTokens = tokenize(previous);
    const nextTokens = tokenize(next);
    const alignment = findOverlap(
      earlierTokens,
      nextTokens,
      expectedOverlapWords,
      maxAlignmentWords,
    );

    if (alignment !== undefined) {
      const prefixEnd = nextTokens[alignment.prefixWords - 1]?.end ?? 0;
      const remaining = next.slice(prefixEnd).trimStart();
      text = remaining.length === 0 ? text : `${text} ${remaining}`;
      diagnostics.overlapWords += alignment.matchedWords;
      diagnostics.droppedDuplicateWords += alignment.prefixWords;
    } else {
      text = `${text} ${UNRESOLVED_TRANSCRIPT_BOUNDARY} ${next}`.trim();
      diagnostics.unresolvedBoundaries += 1;
    }
    previous = next;
  }

  if (pendingFailedSegment) {
    text =
      text.length === 0
        ? UNRESOLVED_TRANSCRIPT_BOUNDARY
        : `${text} ${UNRESOLVED_TRANSCRIPT_BOUNDARY}`;
    diagnostics.unresolvedBoundaries += 1;
  }

  return { text, diagnostics };
}
