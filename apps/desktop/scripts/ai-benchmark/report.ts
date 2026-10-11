const MEDIA_RETIREMENT_GATES = Object.freeze({
  visionAggregateAbsoluteRegression: 0.02,
  visionImportantSliceAbsoluteRegression: 0.05,
  captionTieOrBeatMinimum: 0.8,
  audioAggregateAbsoluteRegression: 0.02,
  audioImportantSliceAbsoluteRegression: 0.04,
  audioBoundaryErrorMaximum: 0.01,
});

export type DecisionStatus = "pass" | "fail" | "not-evaluated";

export type HardwareClass =
  | "apple-silicon-16gb"
  | "windows-discrete-gpu"
  | "cpu-integrated-fallback";

export interface BenchmarkModelIdentity {
  implementation: string;
  implementationRevision: string;
  modelId: string;
  modelRevision: string;
  quantization: string;
  runtimeId: string;
  runtimeVersion: string;
}

export interface OcrComparison {
  baselineCer: number;
  candidateCer: number;
  baselineWer: number;
  candidateWer: number;
}

export interface AudioWerComparison {
  baselineNormalizedWer: number;
  candidateNormalizedWer: number;
}

export interface HardwareBenchmarkStats {
  hardwareClass: HardwareClass;
  systemId: string;
  coldLoadMs?: number;
  warmP50Ms?: number;
  warmP95Ms?: number;
  throughputUnitsPerSecond?: number;
  peakMemoryBytes?: number;
  downloadedBytes?: number;
  cancellation?: "passed" | "failed";
  crashCount?: number;
}

export interface MediaRetirementReportInput {
  runId: string;
  identities: {
    visionBaseline: BenchmarkModelIdentity;
    visionCandidate: BenchmarkModelIdentity;
    audioBaseline: BenchmarkModelIdentity;
    audioCandidate: BenchmarkModelIdentity;
  };
  eligibility: {
    visionCorpus: boolean;
    audioCorpus: boolean;
    audioRuntimeParity: boolean;
  };
  importantSlices: {
    vision: string[];
    audio: string[];
  };
  vision?: {
    ocr: {
      aggregate: OcrComparison;
      slices: Record<string, OcrComparison | undefined>;
    };
    captions: {
      tiesOrCandidateWins: number;
      comparisons: number;
      baselineUnsupportedClaims: number;
      baselineClaimsEvaluated: number;
      candidateUnsupportedClaims: number;
      candidateClaimsEvaluated: number;
    };
  };
  audio?: {
    aggregate: AudioWerComparison;
    slices: Record<string, AudioWerComparison | undefined>;
    boundaries: {
      omissions: number;
      duplications: number;
      referenceWords: number;
    };
    completion: {
      baselineComplete: number;
      baselineFiles: number;
      candidateComplete: number;
      candidateFiles: number;
    };
  };
  hardware: Partial<Record<HardwareClass, HardwareBenchmarkStats>>;
}

export interface RetirementGateResult {
  id: string;
  scope: "vision" | "audio" | "shared";
  label: string;
  status: DecisionStatus;
  measured: string;
  requirement: string;
}

export interface MediaRetirementReport {
  decision: {
    vision: {
      status: DecisionStatus;
      disposition: "eligible-to-retire-florence" | "keep-florence";
    };
    audio: {
      status: DecisionStatus;
      disposition: "eligible-to-retire-whisper" | "keep-whisper";
    };
  };
  gates: RetirementGateResult[];
  markdown: string;
}

const RUN_ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,79}$/;
const SAFE_ID_PATTERN = /^[@A-Za-z0-9][A-Za-z0-9._+:/@-]{0,199}$/;
const SECRET_PATTERN =
  /(?:^|[-_.:/@])(bearer|credential|password|secret|sk)(?:[-_.:/@]|$)/iu;
const FLOAT_TOLERANCE = 1e-12;

const HARDWARE_CLASSES = [
  "apple-silicon-16gb",
  "windows-discrete-gpu",
  "cpu-integrated-fallback",
] as const satisfies readonly HardwareClass[];

const HARDWARE_LABELS = {
  "apple-silicon-16gb": "Apple Silicon 16 GB",
  "windows-discrete-gpu": "Windows discrete GPU",
  "cpu-integrated-fallback": "CPU/integrated fallback",
} satisfies Record<HardwareClass, string>;

function safeIdentifier(value: string, label: string): string {
  if (
    !SAFE_ID_PATTERN.test(value) ||
    value.includes("..") ||
    value.startsWith("/") ||
    value.startsWith("\\") ||
    /^[A-Za-z]:/u.test(value) ||
    SECRET_PATTERN.test(value)
  ) {
    throw new Error(`${label} must be a safe identifier.`);
  }
  return value;
}

function validateIdentity(
  identity: BenchmarkModelIdentity,
  label: string,
): void {
  safeIdentifier(identity.implementation, `${label} implementation`);
  safeIdentifier(
    identity.implementationRevision,
    `${label} implementation revision`,
  );
  safeIdentifier(identity.modelId, `${label} model ID`);
  safeIdentifier(identity.modelRevision, `${label} model revision`);
  safeIdentifier(identity.quantization, `${label} quantization`);
  safeIdentifier(identity.runtimeId, `${label} runtime ID`);
  safeIdentifier(identity.runtimeVersion, `${label} runtime version`);
}

function finiteNonnegative(...values: number[]): boolean {
  return values.every((value) => Number.isFinite(value) && value >= 0);
}

function nonnegativeIntegers(...values: number[]): boolean {
  return values.every((value) => Number.isSafeInteger(value) && value >= 0);
}

function ratio(numerator: number, denominator: number): number | undefined {
  if (!nonnegativeIntegers(numerator, denominator) || denominator === 0)
    return undefined;
  if (numerator > denominator) return undefined;
  return numerator / denominator;
}

function withinAbsoluteRegression(
  baseline: number,
  candidate: number,
  maximum: number,
): boolean {
  return candidate - baseline <= maximum + FLOAT_TOLERANCE;
}

function gate(
  id: string,
  scope: RetirementGateResult["scope"],
  label: string,
  status: DecisionStatus,
  measured: string,
  requirement: string,
): RetirementGateResult {
  return { id, scope, label, status, measured, requirement };
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

function formatDelta(baseline: number, candidate: number): string {
  const delta = (candidate - baseline) * 100;
  return `${delta >= 0 ? "+" : ""}${delta.toFixed(2)} pp`;
}

function unavailableGate(
  id: string,
  scope: RetirementGateResult["scope"],
  label: string,
  requirement: string,
): RetirementGateResult {
  return gate(
    id,
    scope,
    label,
    "not-evaluated",
    "Missing or invalid",
    requirement,
  );
}

function evaluateVisionGates(
  input: MediaRetirementReportInput,
): RetirementGateResult[] {
  const gates: RetirementGateResult[] = [];
  gates.push(
    gate(
      "vision-corpus",
      "vision",
      "Vision corpus eligibility",
      input.eligibility.visionCorpus ? "pass" : "not-evaluated",
      input.eligibility.visionCorpus ? "Eligible" : "Not eligible",
      "Decision-eligible private corpus",
    ),
  );

  const aggregate = input.vision?.ocr.aggregate;
  if (
    aggregate === undefined ||
    !finiteNonnegative(
      aggregate.baselineCer,
      aggregate.candidateCer,
      aggregate.baselineWer,
      aggregate.candidateWer,
    )
  ) {
    gates.push(
      unavailableGate(
        "vision-ocr-aggregate-cer",
        "vision",
        "OCR aggregate CER",
        "Candidate no more than +2.00 pp vs Florence",
      ),
      unavailableGate(
        "vision-ocr-aggregate-wer",
        "vision",
        "OCR aggregate WER",
        "Candidate no more than +2.00 pp vs Florence",
      ),
    );
  } else {
    gates.push(
      gate(
        "vision-ocr-aggregate-cer",
        "vision",
        "OCR aggregate CER",
        withinAbsoluteRegression(
          aggregate.baselineCer,
          aggregate.candidateCer,
          MEDIA_RETIREMENT_GATES.visionAggregateAbsoluteRegression,
        )
          ? "pass"
          : "fail",
        `Florence ${formatPercent(aggregate.baselineCer)}; candidate ${formatPercent(aggregate.candidateCer)} (${formatDelta(aggregate.baselineCer, aggregate.candidateCer)})`,
        "Candidate no more than +2.00 pp vs Florence",
      ),
      gate(
        "vision-ocr-aggregate-wer",
        "vision",
        "OCR aggregate WER",
        withinAbsoluteRegression(
          aggregate.baselineWer,
          aggregate.candidateWer,
          MEDIA_RETIREMENT_GATES.visionAggregateAbsoluteRegression,
        )
          ? "pass"
          : "fail",
        `Florence ${formatPercent(aggregate.baselineWer)}; candidate ${formatPercent(aggregate.candidateWer)} (${formatDelta(aggregate.baselineWer, aggregate.candidateWer)})`,
        "Candidate no more than +2.00 pp vs Florence",
      ),
    );
  }

  const visionSlices = input.importantSlices.vision;
  const sliceRows = visionSlices.map((slice) => {
    safeIdentifier(slice, "Vision slice");
    return [slice, input.vision?.ocr.slices[slice]] as const;
  });
  const slicesEvaluable =
    visionSlices.length > 0 &&
    sliceRows.every(
      ([, stats]) =>
        stats !== undefined &&
        finiteNonnegative(
          stats.baselineCer,
          stats.candidateCer,
          stats.baselineWer,
          stats.candidateWer,
        ),
    );
  if (!slicesEvaluable) {
    gates.push(
      unavailableGate(
        "vision-important-slices",
        "vision",
        "OCR important slices",
        "Every declared slice no more than +5.00 pp in CER and WER",
      ),
    );
  } else {
    const failedSlices = sliceRows.filter(([, stats]) => {
      if (stats === undefined) return true;
      return !(
        withinAbsoluteRegression(
          stats.baselineCer,
          stats.candidateCer,
          MEDIA_RETIREMENT_GATES.visionImportantSliceAbsoluteRegression,
        ) &&
        withinAbsoluteRegression(
          stats.baselineWer,
          stats.candidateWer,
          MEDIA_RETIREMENT_GATES.visionImportantSliceAbsoluteRegression,
        )
      );
    });
    gates.push(
      gate(
        "vision-important-slices",
        "vision",
        "OCR important slices",
        failedSlices.length === 0 ? "pass" : "fail",
        failedSlices.length === 0
          ? `${sliceRows.length} of ${sliceRows.length} passed`
          : `${sliceRows.length - failedSlices.length} of ${sliceRows.length} passed`,
        "Every declared slice no more than +5.00 pp in CER and WER",
      ),
    );
  }

  const captions = input.vision?.captions;
  const preferenceRate =
    captions === undefined
      ? undefined
      : ratio(captions.tiesOrCandidateWins, captions.comparisons);
  gates.push(
    preferenceRate === undefined
      ? unavailableGate(
          "vision-caption-preference",
          "vision",
          "Blind caption tie/beat rate",
          "At least 80.00% tie or beat Florence",
        )
      : gate(
          "vision-caption-preference",
          "vision",
          "Blind caption tie/beat rate",
          preferenceRate + FLOAT_TOLERANCE >=
            MEDIA_RETIREMENT_GATES.captionTieOrBeatMinimum
            ? "pass"
            : "fail",
          formatPercent(preferenceRate),
          "At least 80.00% tie or beat Florence",
        ),
  );

  const baselineUnsupportedRate =
    captions === undefined
      ? undefined
      : ratio(
          captions.baselineUnsupportedClaims,
          captions.baselineClaimsEvaluated,
        );
  const candidateUnsupportedRate =
    captions === undefined
      ? undefined
      : ratio(
          captions.candidateUnsupportedClaims,
          captions.candidateClaimsEvaluated,
        );
  gates.push(
    baselineUnsupportedRate === undefined ||
      candidateUnsupportedRate === undefined
      ? unavailableGate(
          "vision-unsupported-claims",
          "vision",
          "Unsupported-claim rate",
          "Candidate does not exceed Florence",
        )
      : gate(
          "vision-unsupported-claims",
          "vision",
          "Unsupported-claim rate",
          candidateUnsupportedRate <= baselineUnsupportedRate + FLOAT_TOLERANCE
            ? "pass"
            : "fail",
          `Florence ${formatPercent(baselineUnsupportedRate)}; candidate ${formatPercent(candidateUnsupportedRate)}`,
          "Candidate does not exceed Florence",
        ),
  );
  return gates;
}

function evaluateAudioGates(
  input: MediaRetirementReportInput,
): RetirementGateResult[] {
  const gates: RetirementGateResult[] = [
    gate(
      "audio-corpus",
      "audio",
      "Audio corpus eligibility",
      input.eligibility.audioCorpus ? "pass" : "not-evaluated",
      input.eligibility.audioCorpus ? "Eligible" : "Not eligible",
      "Decision-eligible private corpus",
    ),
    gate(
      "audio-runtime-parity",
      "audio",
      "Production runtime parity",
      input.eligibility.audioRuntimeParity ? "pass" : "not-evaluated",
      input.eligibility.audioRuntimeParity ? "Evidenced" : "Not evidenced",
      "Production candidate matches the reference fixture behavior",
    ),
  ];

  const aggregate = input.audio?.aggregate;
  if (
    aggregate === undefined ||
    !finiteNonnegative(
      aggregate.baselineNormalizedWer,
      aggregate.candidateNormalizedWer,
    )
  ) {
    gates.push(
      unavailableGate(
        "audio-aggregate-wer",
        "audio",
        "Normalized aggregate WER",
        "Candidate no more than +2.00 pp vs Whisper",
      ),
    );
  } else {
    gates.push(
      gate(
        "audio-aggregate-wer",
        "audio",
        "Normalized aggregate WER",
        withinAbsoluteRegression(
          aggregate.baselineNormalizedWer,
          aggregate.candidateNormalizedWer,
          MEDIA_RETIREMENT_GATES.audioAggregateAbsoluteRegression,
        )
          ? "pass"
          : "fail",
        `Whisper ${formatPercent(aggregate.baselineNormalizedWer)}; candidate ${formatPercent(aggregate.candidateNormalizedWer)} (${formatDelta(aggregate.baselineNormalizedWer, aggregate.candidateNormalizedWer)})`,
        "Candidate no more than +2.00 pp vs Whisper",
      ),
    );
  }

  const audioSlices = input.importantSlices.audio;
  const sliceRows = audioSlices.map((slice) => {
    safeIdentifier(slice, "Audio slice");
    return [slice, input.audio?.slices[slice]] as const;
  });
  const slicesEvaluable =
    audioSlices.length > 0 &&
    sliceRows.every(
      ([, stats]) =>
        stats !== undefined &&
        finiteNonnegative(
          stats.baselineNormalizedWer,
          stats.candidateNormalizedWer,
        ),
    );
  if (!slicesEvaluable) {
    gates.push(
      unavailableGate(
        "audio-important-slices",
        "audio",
        "Audio important slices",
        "Every declared slice no more than +4.00 pp in normalized WER",
      ),
    );
  } else {
    const passingSlices = sliceRows.filter(([, stats]) => {
      if (stats === undefined) return false;
      return withinAbsoluteRegression(
        stats.baselineNormalizedWer,
        stats.candidateNormalizedWer,
        MEDIA_RETIREMENT_GATES.audioImportantSliceAbsoluteRegression,
      );
    }).length;
    gates.push(
      gate(
        "audio-important-slices",
        "audio",
        "Audio important slices",
        passingSlices === sliceRows.length ? "pass" : "fail",
        `${passingSlices} of ${sliceRows.length} passed`,
        "Every declared slice no more than +4.00 pp in normalized WER",
      ),
    );
  }

  const boundaries = input.audio?.boundaries;
  const boundaryRate =
    boundaries === undefined ||
    !nonnegativeIntegers(
      boundaries.omissions,
      boundaries.duplications,
      boundaries.referenceWords,
    ) ||
    boundaries.referenceWords === 0
      ? undefined
      : (boundaries.omissions + boundaries.duplications) /
        boundaries.referenceWords;
  gates.push(
    boundaryRate === undefined
      ? unavailableGate(
          "audio-boundaries",
          "audio",
          "Boundary omissions and duplications",
          "Under 1.00% of reference words",
        )
      : gate(
          "audio-boundaries",
          "audio",
          "Boundary omissions and duplications",
          boundaryRate < MEDIA_RETIREMENT_GATES.audioBoundaryErrorMaximum
            ? "pass"
            : "fail",
          formatPercent(boundaryRate),
          "Under 1.00% of reference words",
        ),
  );

  const completion = input.audio?.completion;
  const baselineCompletion =
    completion === undefined
      ? undefined
      : ratio(completion.baselineComplete, completion.baselineFiles);
  const candidateCompletion =
    completion === undefined
      ? undefined
      : ratio(completion.candidateComplete, completion.candidateFiles);
  gates.push(
    baselineCompletion === undefined || candidateCompletion === undefined
      ? unavailableGate(
          "audio-completion",
          "audio",
          "Whole-file completion",
          "Candidate no worse than Whisper",
        )
      : gate(
          "audio-completion",
          "audio",
          "Whole-file completion",
          candidateCompletion + FLOAT_TOLERANCE >= baselineCompletion
            ? "pass"
            : "fail",
          `Whisper ${formatPercent(baselineCompletion)}; candidate ${formatPercent(candidateCompletion)}`,
          "Candidate no worse than Whisper",
        ),
  );
  return gates;
}

function completeHardware(
  stats: HardwareBenchmarkStats | undefined,
): Required<HardwareBenchmarkStats> | undefined {
  if (stats === undefined) return undefined;
  safeIdentifier(stats.systemId, "Hardware system ID");
  const {
    coldLoadMs,
    warmP50Ms,
    warmP95Ms,
    throughputUnitsPerSecond,
    peakMemoryBytes,
    downloadedBytes,
    cancellation,
    crashCount,
  } = stats;
  if (
    coldLoadMs === undefined ||
    warmP50Ms === undefined ||
    warmP95Ms === undefined ||
    throughputUnitsPerSecond === undefined ||
    peakMemoryBytes === undefined ||
    downloadedBytes === undefined ||
    cancellation === undefined ||
    crashCount === undefined ||
    !finiteNonnegative(
      coldLoadMs,
      warmP50Ms,
      warmP95Ms,
      throughputUnitsPerSecond,
      peakMemoryBytes,
      downloadedBytes,
    ) ||
    throughputUnitsPerSecond <= 0 ||
    warmP95Ms < warmP50Ms ||
    !Number.isSafeInteger(crashCount) ||
    crashCount < 0
  )
    return undefined;
  return {
    hardwareClass: stats.hardwareClass,
    systemId: stats.systemId,
    coldLoadMs,
    warmP50Ms,
    warmP95Ms,
    throughputUnitsPerSecond,
    peakMemoryBytes,
    downloadedBytes,
    cancellation,
    crashCount,
  };
}

function evaluateHardwareGate(
  input: MediaRetirementReportInput,
): RetirementGateResult {
  const present = HARDWARE_CLASSES.filter((hardwareClass) => {
    const stats = input.hardware[hardwareClass];
    return (
      stats?.hardwareClass === hardwareClass &&
      completeHardware(stats) !== undefined
    );
  });
  return gate(
    "required-hardware",
    "shared",
    "Required hardware coverage",
    present.length === HARDWARE_CLASSES.length ? "pass" : "not-evaluated",
    `${present.length} of ${HARDWARE_CLASSES.length} complete`,
    "Complete metrics for Apple Silicon 16 GB, Windows discrete GPU, and CPU/integrated fallback",
  );
}

function decisionStatus(
  gates: readonly RetirementGateResult[],
  scope: "vision" | "audio",
): DecisionStatus {
  const relevant = gates.filter(
    (result) => result.scope === scope || result.scope === "shared",
  );
  if (relevant.some((result) => result.status === "not-evaluated"))
    return "not-evaluated";
  return relevant.some((result) => result.status === "fail") ? "fail" : "pass";
}

function statusLabel(status: DecisionStatus): string {
  if (status === "not-evaluated") return "NOT EVALUATED";
  return status.toUpperCase();
}

function identityRows(input: MediaRetirementReportInput): string[] {
  const identities: Array<readonly [string, BenchmarkModelIdentity]> = [
    ["Vision baseline", input.identities.visionBaseline],
    ["Vision candidate", input.identities.visionCandidate],
    ["Audio baseline", input.identities.audioBaseline],
    ["Audio candidate", input.identities.audioCandidate],
  ];
  return identities.map(([role, identity]) => {
    return `| ${role} | ${identity.implementation} | ${identity.modelId} | ${identity.modelRevision} | ${identity.quantization} | ${identity.runtimeId} | ${identity.runtimeVersion} | ${identity.implementationRevision} |`;
  });
}

function ocrSliceRows(input: MediaRetirementReportInput): string[] {
  return input.importantSlices.vision.map((slice) => {
    const stats = input.vision?.ocr.slices[slice];
    if (
      stats === undefined ||
      !finiteNonnegative(
        stats.baselineCer,
        stats.candidateCer,
        stats.baselineWer,
        stats.candidateWer,
      )
    )
      return `| ${slice} | Missing | Missing | Missing | Missing |`;
    return `| ${slice} | ${formatPercent(stats.baselineCer)} | ${formatPercent(stats.candidateCer)} | ${formatPercent(stats.baselineWer)} | ${formatPercent(stats.candidateWer)} |`;
  });
}

function audioSliceRows(input: MediaRetirementReportInput): string[] {
  return input.importantSlices.audio.map((slice) => {
    const stats = input.audio?.slices[slice];
    if (
      stats === undefined ||
      !finiteNonnegative(
        stats.baselineNormalizedWer,
        stats.candidateNormalizedWer,
      )
    )
      return `| ${slice} | Missing | Missing |`;
    return `| ${slice} | ${formatPercent(stats.baselineNormalizedWer)} | ${formatPercent(stats.candidateNormalizedWer)} |`;
  });
}

function hardwareRows(input: MediaRetirementReportInput): string[] {
  return HARDWARE_CLASSES.map((hardwareClass) => {
    const stats = completeHardware(input.hardware[hardwareClass]);
    if (stats === undefined || stats.hardwareClass !== hardwareClass)
      return `| ${HARDWARE_LABELS[hardwareClass]} | Missing | — | — | — | — | — | — | — | — |`;
    return `| ${HARDWARE_LABELS[hardwareClass]} | Complete | ${stats.systemId} | ${stats.coldLoadMs.toFixed(0)} ms | ${stats.warmP50Ms.toFixed(0)} / ${stats.warmP95Ms.toFixed(0)} ms | ${stats.throughputUnitsPerSecond.toFixed(2)} units/s | ${stats.peakMemoryBytes.toFixed(0)} | ${stats.downloadedBytes.toFixed(0)} | ${stats.cancellation} | ${stats.crashCount} |`;
  });
}

function renderMarkdown(
  input: MediaRetirementReportInput,
  gates: RetirementGateResult[],
  visionStatus: DecisionStatus,
  audioStatus: DecisionStatus,
): string {
  const aggregateOcr = input.vision?.ocr.aggregate;
  const aggregateAudio = input.audio?.aggregate;
  const aggregateOcrRow =
    aggregateOcr !== undefined &&
    finiteNonnegative(
      aggregateOcr.baselineCer,
      aggregateOcr.candidateCer,
      aggregateOcr.baselineWer,
      aggregateOcr.candidateWer,
    )
      ? `| Overall | ${formatPercent(aggregateOcr.baselineCer)} | ${formatPercent(aggregateOcr.candidateCer)} | ${formatPercent(aggregateOcr.baselineWer)} | ${formatPercent(aggregateOcr.candidateWer)} |`
      : "| Overall | Missing | Missing | Missing | Missing |";
  const aggregateAudioRow =
    aggregateAudio !== undefined &&
    finiteNonnegative(
      aggregateAudio.baselineNormalizedWer,
      aggregateAudio.candidateNormalizedWer,
    )
      ? `| Overall | ${formatPercent(aggregateAudio.baselineNormalizedWer)} | ${formatPercent(aggregateAudio.candidateNormalizedWer)} |`
      : "| Overall | Missing | Missing |";
  const gateRows = gates.map(
    (result) =>
      `| ${result.label} | ${statusLabel(result.status)} | ${result.measured} | ${result.requirement} |`,
  );

  return [
    "# Local media model retirement decision",
    "",
    `Run: \`${input.runId}\``,
    "",
    "This report contains only structured aggregate measurements and bounded identities. Florence and Whisper remain installed unless their independent decision is PASS.",
    "",
    "## Decision",
    "",
    `- Vision: **${statusLabel(visionStatus)}** — ${visionStatus === "pass" ? "eligible to retire Florence" : "keep Florence"}.`,
    `- Audio: **${statusLabel(audioStatus)}** — ${audioStatus === "pass" ? "eligible to retire Whisper" : "keep Whisper"}.`,
    "",
    "## Eligibility",
    "",
    `- Vision corpus: ${input.eligibility.visionCorpus ? "eligible" : "not eligible"}`,
    `- Audio corpus: ${input.eligibility.audioCorpus ? "eligible" : "not eligible"}`,
    `- Audio production-runtime parity: ${input.eligibility.audioRuntimeParity ? "evidenced" : "not evidenced"}`,
    "",
    "## Identities",
    "",
    "| Role | Implementation | Model | Model revision | Quantization | Runtime | Runtime version | Implementation revision |",
    "| --- | --- | --- | --- | --- | --- | --- | --- |",
    ...identityRows(input),
    "",
    "## Gates",
    "",
    "| Gate | Status | Measurement | Requirement |",
    "| --- | --- | --- | --- |",
    ...gateRows,
    "",
    "## Vision OCR",
    "",
    "| Slice | Florence CER | Candidate CER | Florence WER | Candidate WER |",
    "| --- | ---: | ---: | ---: | ---: |",
    aggregateOcrRow,
    ...ocrSliceRows(input),
    "",
    "## Audio",
    "",
    "| Slice | Whisper normalized WER | Candidate normalized WER |",
    "| --- | ---: | ---: |",
    aggregateAudioRow,
    ...audioSliceRows(input),
    "",
    "## Hardware",
    "",
    "| Class | Coverage | System | Cold load | Warm p50 / p95 | Throughput | Peak memory (bytes) | Downloaded bytes | Cancellation | Crash count |",
    "| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | --- | ---: |",
    ...hardwareRows(input),
    "",
  ].join("\n");
}

function validateInput(input: MediaRetirementReportInput): void {
  if (!RUN_ID_PATTERN.test(input.runId))
    throw new Error("Benchmark run ID contains unsupported characters.");
  validateIdentity(input.identities.visionBaseline, "Vision baseline");
  validateIdentity(input.identities.visionCandidate, "Vision candidate");
  validateIdentity(input.identities.audioBaseline, "Audio baseline");
  validateIdentity(input.identities.audioCandidate, "Audio candidate");
  for (const slice of [
    ...input.importantSlices.vision,
    ...input.importantSlices.audio,
  ])
    safeIdentifier(slice, "Important slice");
}

export function createMediaRetirementReport(
  input: MediaRetirementReportInput,
): MediaRetirementReport {
  validateInput(input);
  const gates = [
    ...evaluateVisionGates(input),
    ...evaluateAudioGates(input),
    evaluateHardwareGate(input),
  ];
  const visionStatus = decisionStatus(gates, "vision");
  const audioStatus = decisionStatus(gates, "audio");
  return {
    decision: {
      vision: {
        status: visionStatus,
        disposition:
          visionStatus === "pass"
            ? "eligible-to-retire-florence"
            : "keep-florence",
      },
      audio: {
        status: audioStatus,
        disposition:
          audioStatus === "pass"
            ? "eligible-to-retire-whisper"
            : "keep-whisper",
      },
    },
    gates,
    markdown: renderMarkdown(input, gates, visionStatus, audioStatus),
  };
}

export function mediaRetirementReportPath(runId: string): string {
  if (!RUN_ID_PATTERN.test(runId))
    throw new Error("Benchmark run ID contains unsupported characters.");
  return `.tmp/benchmarks/${runId}/decision-report.md`;
}
