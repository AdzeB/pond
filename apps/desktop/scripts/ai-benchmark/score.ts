export interface ErrorRateStats {
  errors: number;
  referenceUnits: number;
  rate: number;
}

export interface TextErrorStats {
  cer: ErrorRateStats;
  wer: ErrorRateStats;
}

export interface ExactFieldStats {
  matched: number;
  total: number;
  accuracy: number | null;
}

export interface BoundaryErrorStats {
  omissions: number;
  duplications: number;
}

export interface RatioMetric {
  numerator: number;
  denominator: number;
  value: number;
}

export type BenchmarkRatioMetrics = Readonly<Record<string, RatioMetric>>;

export interface OcrScore {
  raw: TextErrorStats;
  searchability: TextErrorStats;
  exactFields: ExactFieldStats;
  metrics: BenchmarkRatioMetrics;
}

export interface AsrScore {
  punctuationSensitive: TextErrorStats;
  normalized: TextErrorStats;
  boundaries: BoundaryErrorStats;
  boundaryReferenceWords: number;
  exactFields: ExactFieldStats;
  metrics: BenchmarkRatioMetrics;
}

function levenshteinDistance<T>(
  reference: readonly T[],
  hypothesis: readonly T[],
): number {
  if (reference.length === 0) return hypothesis.length;
  if (hypothesis.length === 0) return reference.length;

  let previous = Array.from(
    { length: hypothesis.length + 1 },
    (_, index) => index,
  );
  for (
    let referenceIndex = 1;
    referenceIndex <= reference.length;
    referenceIndex++
  ) {
    const current = [referenceIndex];
    for (
      let hypothesisIndex = 1;
      hypothesisIndex <= hypothesis.length;
      hypothesisIndex++
    ) {
      const substitutionCost =
        reference[referenceIndex - 1] === hypothesis[hypothesisIndex - 1]
          ? 0
          : 1;
      current[hypothesisIndex] = Math.min(
        (current[hypothesisIndex - 1] ?? 0) + 1,
        (previous[hypothesisIndex] ?? 0) + 1,
        (previous[hypothesisIndex - 1] ?? 0) + substitutionCost,
      );
    }
    previous = current;
  }
  return previous[hypothesis.length] ?? 0;
}

function errorRateStats<T>(
  reference: readonly T[],
  hypothesis: readonly T[],
): ErrorRateStats {
  const errors = levenshteinDistance(reference, hypothesis);
  const denominator = Math.max(1, reference.length);
  return {
    errors,
    referenceUnits: reference.length,
    rate: errors / denominator,
  };
}

function words(value: string): string[] {
  const trimmed = value.trim();
  return trimmed.length === 0 ? [] : trimmed.split(/\s+/u);
}

function textErrorStats(reference: string, hypothesis: string): TextErrorStats {
  return {
    cer: errorRateStats(Array.from(reference), Array.from(hypothesis)),
    wer: errorRateStats(words(reference), words(hypothesis)),
  };
}

export function characterErrorRate(
  reference: string,
  hypothesis: string,
): number {
  return textErrorStats(reference, hypothesis).cer.rate;
}

export function wordErrorRate(reference: string, hypothesis: string): number {
  return textErrorStats(reference, hypothesis).wer.rate;
}

function normalizeForRetrieval(value: string): string {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\p{P}\p{S}]+/gu, " ")
    .trim()
    .replace(/\s+/gu, " ");
}

export function normalizeSearchabilityText(value: string): string {
  return normalizeForRetrieval(value);
}

export function normalizeAsrText(value: string): string {
  return normalizeForRetrieval(value);
}

export function exactFieldMetrics(
  fields: readonly string[],
  hypothesis: string,
): ExactFieldStats {
  const matched = fields.filter((field) => hypothesis.includes(field)).length;
  return {
    matched,
    total: fields.length,
    accuracy: fields.length === 0 ? null : matched / fields.length,
  };
}

function ratioMetric(numerator: number, denominator: number): RatioMetric {
  const safeDenominator = Math.max(1, denominator);
  return {
    numerator,
    denominator: safeDenominator,
    value: numerator / safeDenominator,
  };
}

function errorMetric(stats: ErrorRateStats): RatioMetric {
  return ratioMetric(stats.errors, stats.referenceUnits);
}

function exactFieldMetric(stats: ExactFieldStats): RatioMetric | undefined {
  if (stats.total === 0) return undefined;
  return ratioMetric(stats.matched, stats.total);
}

export function scoreOcr(
  reference: string,
  hypothesis: string,
  exactFields: readonly string[],
): OcrScore {
  const raw = textErrorStats(reference, hypothesis);
  const searchability = textErrorStats(
    normalizeSearchabilityText(reference),
    normalizeSearchabilityText(hypothesis),
  );
  const fields = exactFieldMetrics(exactFields, hypothesis);
  const fieldMetric = exactFieldMetric(fields);
  const baseMetrics = {
    "ocr.raw.cer": errorMetric(raw.cer),
    "ocr.raw.wer": errorMetric(raw.wer),
    "ocr.searchability.cer": errorMetric(searchability.cer),
    "ocr.searchability.wer": errorMetric(searchability.wer),
  } satisfies BenchmarkRatioMetrics;
  const metrics =
    fieldMetric === undefined
      ? baseMetrics
      : { ...baseMetrics, "ocr.exact-field-accuracy": fieldMetric };

  return {
    raw,
    searchability,
    exactFields: fields,
    metrics,
  };
}

function longestCommonSubsequenceLength<T>(
  reference: readonly T[],
  hypothesis: readonly T[],
): number {
  let previous = Array.from({ length: hypothesis.length + 1 }, () => 0);
  for (const referenceUnit of reference) {
    const current = [0];
    for (let index = 1; index <= hypothesis.length; index++) {
      current[index] =
        referenceUnit === hypothesis[index - 1]
          ? (previous[index - 1] ?? 0) + 1
          : Math.max(previous[index] ?? 0, current[index - 1] ?? 0);
    }
    previous = current;
  }
  return previous[hypothesis.length] ?? 0;
}

export function boundaryErrors(
  reference: string,
  hypothesis: string,
): BoundaryErrorStats {
  const referenceWords = words(normalizeAsrText(reference));
  const hypothesisWords = words(normalizeAsrText(hypothesis));
  const alignedWords = longestCommonSubsequenceLength(
    referenceWords,
    hypothesisWords,
  );
  return {
    omissions: referenceWords.length - alignedWords,
    duplications: hypothesisWords.length - alignedWords,
  };
}

export function scoreAsr(
  reference: string,
  hypothesis: string,
  exactFields: readonly string[],
): AsrScore {
  const punctuationSensitive = textErrorStats(reference, hypothesis);
  const normalized = textErrorStats(
    normalizeAsrText(reference),
    normalizeAsrText(hypothesis),
  );
  const boundaries = boundaryErrors(reference, hypothesis);
  const boundaryReferenceWords = words(normalizeAsrText(reference)).length;
  const fields = exactFieldMetrics(exactFields, hypothesis);
  const fieldMetric = exactFieldMetric(fields);
  const baseMetrics = {
    "asr.punctuation-sensitive.cer": errorMetric(punctuationSensitive.cer),
    "asr.punctuation-sensitive.wer": errorMetric(punctuationSensitive.wer),
    "asr.normalized.cer": errorMetric(normalized.cer),
    "asr.normalized.wer": errorMetric(normalized.wer),
    "asr.boundary-omission-rate": ratioMetric(
      boundaries.omissions,
      boundaryReferenceWords,
    ),
    "asr.boundary-duplication-rate": ratioMetric(
      boundaries.duplications,
      boundaryReferenceWords,
    ),
  } satisfies BenchmarkRatioMetrics;
  const metrics =
    fieldMetric === undefined
      ? baseMetrics
      : { ...baseMetrics, "asr.exact-field-accuracy": fieldMetric };

  return {
    punctuationSensitive,
    normalized,
    boundaries,
    boundaryReferenceWords,
    exactFields: fields,
    metrics,
  };
}

export interface BenchmarkScoreSample {
  id: string;
  slices: readonly string[];
  hardware: string;
  metrics: BenchmarkRatioMetrics;
}

export interface AggregateScoreGroup {
  sampleCount: number;
  sampleIds: string[];
  metrics: Record<string, RatioMetric>;
}

export interface BenchmarkScoreAggregate {
  overall: AggregateScoreGroup;
  bySlice: Record<string, AggregateScoreGroup>;
  byHardware: Record<string, AggregateScoreGroup>;
  bySliceAndHardware: Record<string, Record<string, AggregateScoreGroup>>;
}

function aggregateGroup(
  samples: readonly BenchmarkScoreSample[],
): AggregateScoreGroup {
  const metricNames = Array.from(
    new Set(samples.flatMap((sample) => Object.keys(sample.metrics))),
  ).sort();
  const metrics: Record<string, RatioMetric> = {};
  for (const metricName of metricNames) {
    let numerator = 0;
    let denominator = 0;
    for (const sample of samples) {
      const metric = sample.metrics[metricName];
      if (metric === undefined) continue;
      numerator += metric.numerator;
      denominator += metric.denominator;
    }
    metrics[metricName] = ratioMetric(numerator, denominator);
  }
  return {
    sampleCount: samples.length,
    sampleIds: samples.map((sample) => sample.id).sort(),
    metrics,
  };
}

function groupBy(
  samples: readonly BenchmarkScoreSample[],
  keysFor: (sample: BenchmarkScoreSample) => readonly string[],
): Map<string, BenchmarkScoreSample[]> {
  const groups = new Map<string, BenchmarkScoreSample[]>();
  for (const sample of samples) {
    for (const key of new Set(keysFor(sample))) {
      const group = groups.get(key) ?? [];
      group.push(sample);
      groups.set(key, group);
    }
  }
  return groups;
}

function aggregateGroups(
  groups: ReadonlyMap<string, BenchmarkScoreSample[]>,
): Record<string, AggregateScoreGroup> {
  return Object.fromEntries(
    Array.from(groups.entries())
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, samples]) => [key, aggregateGroup(samples)]),
  );
}

export function aggregateBenchmarkScores(
  samples: readonly BenchmarkScoreSample[],
): BenchmarkScoreAggregate {
  const bySliceSamples = groupBy(samples, (sample) => sample.slices);
  const byHardwareSamples = groupBy(samples, (sample) => [sample.hardware]);
  const bySliceAndHardware = Object.fromEntries(
    Array.from(bySliceSamples.entries())
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([slice, sliceSamples]) => [
        slice,
        aggregateGroups(groupBy(sliceSamples, (sample) => [sample.hardware])),
      ]),
  );

  return {
    overall: aggregateGroup(samples),
    bySlice: aggregateGroups(bySliceSamples),
    byHardware: aggregateGroups(byHardwareSamples),
    bySliceAndHardware,
  };
}
