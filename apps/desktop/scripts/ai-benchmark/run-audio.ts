import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { segmentAudio } from "./audio-segments";
import type { AudioManifestItem } from "./manifest";
import { type AsrScore, scoreAsr } from "./score";
import { type StitchDiagnostics, stitchTranscript } from "./stitch-transcript";

export const AUDIO_BENCHMARK_POLICY = Object.freeze({
  sampleRate: 16_000,
  channels: 1,
  windowSeconds: 30,
  overlapSeconds: 5,
  durationToleranceMs: 1,
  maxSourceBytes: 16 * 1024 * 1024,
  maxSegmentOutputCharacters: 16_000,
  maxWholeFileOutputCharacters: 1_000_000,
  maxRecordedDurationMs: 24 * 60 * 60 * 1_000,
});

export type AudioBenchmarkPhase = "cold" | "warm";
export type AudioBenchmarkFailureCode =
  | "inference-failed"
  | "empty-output"
  | "output-too-long";

export type AudioDecisionIneligibility =
  | "corpus-not-decision-eligible"
  | "production-runtime-fixture-parity-not-evidenced";

export interface CanonicalAudioWaveform {
  readonly sampleRate: 16_000;
  readonly channels: 1;
  readonly samples: Float32Array;
  readonly durationMs: number;
}

export interface DecodedAudioWaveform {
  readonly sampleRate: number;
  readonly channels: number;
  readonly samples: Float32Array;
  readonly durationMs: number;
}

interface AudioImplementationMetadata {
  readonly implementation: "whisper" | "gemma";
  readonly implementationRevision: string;
  readonly runtime: string;
  readonly runtimeVersion: string;
  readonly library: string;
  readonly libraryVersion: string;
  readonly modelId: string;
  readonly modelRevision: string;
  readonly quantization: string;
}

export interface CurrentWhisperMetadata extends AudioImplementationMetadata {
  readonly implementation: "whisper";
}

export interface GemmaReferenceMetadata extends AudioImplementationMetadata {
  readonly implementation: "gemma";
}

export interface WhisperWaveformInvocation {
  readonly audio: Readonly<CanonicalAudioWaveform>;
  readonly chunkLengthSeconds: 30;
  readonly strideLengthSeconds: 5;
  readonly task: "transcribe";
}

export interface GemmaSegmentInvocation {
  readonly audio: Readonly<CanonicalAudioWaveform>;
  readonly segmentIndex: number;
  readonly startSample: number;
  readonly endSample: number;
}

export interface CurrentWhisperAdapter {
  readonly metadata: CurrentWhisperMetadata;
  transcribeCompleteWaveform(
    invocation: WhisperWaveformInvocation,
  ): Promise<{ text: string }>;
}

export interface GemmaReferenceAdapter {
  readonly metadata: GemmaReferenceMetadata;
  transcribeSegment(
    invocation: GemmaSegmentInvocation,
  ): Promise<{ text: string }>;
}

export interface AudioBenchmarkDependencies {
  readSource(path: string): Promise<Uint8Array>;
  decodeAudio(bytes: Uint8Array): Promise<DecodedAudioWaveform>;
  now(): number;
  memoryBytes(): number;
}

export interface ProductionRuntimeParityEvidence {
  readonly candidateRuntimeId: string;
  readonly candidateRuntimeVersion: string;
  readonly fixtureSetId: string;
  readonly evidenceHash: string;
}

export type RecordedProductionRuntimeParity =
  | { readonly status: "not-evidenced" }
  | ({ readonly status: "evidenced" } & ProductionRuntimeParityEvidence);

export interface AudioBenchmarkSegmentResult {
  readonly segmentIndex: number;
  readonly startSample: number;
  readonly endSample: number;
  readonly outputText: string | null;
  readonly failureCode: AudioBenchmarkFailureCode | null;
  readonly durationMs: number;
  readonly phase: AudioBenchmarkPhase;
  readonly processMemoryBeforeBytes: number;
  readonly processMemoryAfterBytes: number;
}

export interface AudioBenchmarkRow extends AudioImplementationMetadata {
  readonly corpusId: string;
  readonly corpusItemId: string;
  readonly sourceHash: string;
  readonly segments: readonly AudioBenchmarkSegmentResult[];
  readonly wholeFileTranscript: string | null;
  readonly stitchDiagnostics: StitchDiagnostics;
  readonly score: AsrScore;
  readonly totalDurationMs: number;
  readonly stitchDurationMs: number;
  readonly realTimeFactor: number;
  readonly peakMemoryBytes: number;
  readonly wholeFileComplete: boolean;
  readonly productionRuntimeParity: RecordedProductionRuntimeParity;
  readonly decisionEligible: boolean;
  readonly decisionIneligibility: readonly AudioDecisionIneligibility[];
}

export interface AudioBenchmarkPaths {
  readonly directory: string;
  readonly results: string;
}

export interface AudioBenchmarkResult {
  readonly paths: AudioBenchmarkPaths;
  readonly rows: readonly AudioBenchmarkRow[];
  readonly productionRuntimeParity: RecordedProductionRuntimeParity;
  readonly decisionEligible: boolean;
  readonly decisionIneligibility: readonly AudioDecisionIneligibility[];
}

interface AudioDecisionStatus {
  readonly decisionEligible: boolean;
  readonly decisionIneligibility: readonly AudioDecisionIneligibility[];
}

const RUN_ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,79}$/;
const CORPUS_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/;
const METADATA_ID_PATTERN = /^[@A-Za-z0-9][A-Za-z0-9._+:/@-]{0,199}$/;
const SHA_256_PATTERN = /^[a-f0-9]{64}$/;
const MAX_METADATA_CHARACTERS = 200;

function boundedNumber(value: number, maximum: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(maximum, Math.max(0, Math.round(value)));
}

function validateIdentifier(
  value: string,
  pattern: RegExp,
  description: string,
): void {
  if (!pattern.test(value)) {
    throw new Error(`${description} contains unsupported characters.`);
  }
}

function validateMetadata(metadata: AudioImplementationMetadata): void {
  for (const value of [
    metadata.implementationRevision,
    metadata.runtimeVersion,
    metadata.library,
    metadata.libraryVersion,
    metadata.modelId,
    metadata.modelRevision,
    metadata.quantization,
  ]) {
    if (
      value.trim().length === 0 ||
      value.length > MAX_METADATA_CHARACTERS ||
      !METADATA_ID_PATTERN.test(value)
    ) {
      throw new Error(
        "Audio benchmark implementation metadata must be exact, pinned, and bounded.",
      );
    }
  }
}

function validateImplementations(
  whisper: CurrentWhisperAdapter,
  gemma: GemmaReferenceAdapter,
): void {
  validateMetadata(whisper.metadata);
  validateMetadata(gemma.metadata);
  if (
    whisper.metadata.implementation !== "whisper" ||
    whisper.metadata.runtime !== "pond-current-whisper-pipeline"
  ) {
    throw new Error(
      "Whisper must use Pond's current complete-waveform pipeline contract.",
    );
  }
  if (
    gemma.metadata.implementation !== "gemma" ||
    gemma.metadata.runtime !== "google-transformers-any-to-any-reference" ||
    gemma.metadata.library !== "transformers"
  ) {
    throw new Error(
      "Gemma must use Google's documented Transformers any-to-any reference runtime.",
    );
  }
}

function validateParityEvidence(
  evidence: ProductionRuntimeParityEvidence | undefined,
): RecordedProductionRuntimeParity {
  if (evidence === undefined) return { status: "not-evidenced" };
  for (const [description, value] of [
    ["Candidate runtime ID", evidence.candidateRuntimeId],
    ["Candidate runtime version", evidence.candidateRuntimeVersion],
    ["Fixture set ID", evidence.fixtureSetId],
  ] as const) {
    validateIdentifier(value, METADATA_ID_PATTERN, description);
  }
  if (!SHA_256_PATTERN.test(evidence.evidenceHash)) {
    throw new Error("Fixture parity evidence must have a SHA-256 hash.");
  }
  return { status: "evidenced", ...evidence };
}

function validateWaveform(
  waveform: DecodedAudioWaveform,
  declaredDurationMs: number,
): CanonicalAudioWaveform {
  if (
    waveform.sampleRate !== AUDIO_BENCHMARK_POLICY.sampleRate ||
    waveform.channels !== AUDIO_BENCHMARK_POLICY.channels ||
    !(waveform.samples instanceof Float32Array)
  ) {
    throw new Error("The audio decoder must return 16 kHz mono Float32 audio.");
  }
  if (waveform.samples.some((sample) => !Number.isFinite(sample))) {
    throw new Error("The audio decoder must return only finite samples.");
  }
  const sampleDurationMs =
    (waveform.samples.length / AUDIO_BENCHMARK_POLICY.sampleRate) * 1_000;
  if (
    !Number.isFinite(waveform.durationMs) ||
    Math.abs(waveform.durationMs - sampleDurationMs) >
      AUDIO_BENCHMARK_POLICY.durationToleranceMs ||
    Math.abs(declaredDurationMs - sampleDurationMs) >
      AUDIO_BENCHMARK_POLICY.durationToleranceMs
  ) {
    throw new Error(
      "Decoded and declared audio duration must agree with the canonical waveform.",
    );
  }
  return {
    sampleRate: AUDIO_BENCHMARK_POLICY.sampleRate,
    channels: AUDIO_BENCHMARK_POLICY.channels,
    samples: waveform.samples,
    durationMs: waveform.durationMs,
  };
}

function decisionStatus(input: {
  corpusDecisionEligible: boolean;
  parity: RecordedProductionRuntimeParity;
}): AudioDecisionStatus {
  const decisionIneligibility: AudioDecisionIneligibility[] = [];
  if (!input.corpusDecisionEligible) {
    decisionIneligibility.push("corpus-not-decision-eligible");
  }
  if (input.parity.status !== "evidenced") {
    decisionIneligibility.push(
      "production-runtime-fixture-parity-not-evidenced",
    );
  }
  return {
    decisionEligible: decisionIneligibility.length === 0,
    decisionIneligibility,
  };
}

function normalizeOutput(
  result: { text: string },
  maximumCharacters: number,
): Pick<AudioBenchmarkSegmentResult, "outputText" | "failureCode"> {
  const outputText = result.text.replace(/\r\n?/gu, "\n").trim();
  if (outputText.length === 0) {
    return { outputText: null, failureCode: "empty-output" };
  }
  if (outputText.length > maximumCharacters) {
    return { outputText: null, failureCode: "output-too-long" };
  }
  return { outputText, failureCode: null };
}

function failedOutput(): Pick<
  AudioBenchmarkSegmentResult,
  "outputText" | "failureCode"
> {
  return { outputText: null, failureCode: "inference-failed" };
}

function zeroStitchDiagnostics(): StitchDiagnostics {
  return {
    overlapWords: 0,
    droppedDuplicateWords: 0,
    unresolvedBoundaries: 0,
  };
}

function waveformView(
  waveform: CanonicalAudioWaveform,
  start: number,
  end: number,
): CanonicalAudioWaveform {
  return {
    sampleRate: AUDIO_BENCHMARK_POLICY.sampleRate,
    channels: AUDIO_BENCHMARK_POLICY.channels,
    samples: waveform.samples.slice(start, end),
    durationMs: ((end - start) / AUDIO_BENCHMARK_POLICY.sampleRate) * 1_000,
  };
}

async function measureSegment(input: {
  segmentIndex: number;
  startSample: number;
  endSample: number;
  phase: AudioBenchmarkPhase;
  maximumCharacters: number;
  dependencies: AudioBenchmarkDependencies;
  invoke(): Promise<{ text: string }>;
}): Promise<AudioBenchmarkSegmentResult> {
  const processMemoryBeforeBytes = boundedNumber(
    input.dependencies.memoryBytes(),
    Number.MAX_SAFE_INTEGER,
  );
  const startedAt = input.dependencies.now();
  let output: Pick<AudioBenchmarkSegmentResult, "outputText" | "failureCode">;
  try {
    output = normalizeOutput(await input.invoke(), input.maximumCharacters);
  } catch {
    output = failedOutput();
  }
  const durationMs = boundedNumber(
    input.dependencies.now() - startedAt,
    AUDIO_BENCHMARK_POLICY.maxRecordedDurationMs,
  );
  const processMemoryAfterBytes = boundedNumber(
    input.dependencies.memoryBytes(),
    Number.MAX_SAFE_INTEGER,
  );
  return {
    segmentIndex: input.segmentIndex,
    startSample: input.startSample,
    endSample: input.endSample,
    ...output,
    durationMs,
    phase: input.phase,
    processMemoryBeforeBytes,
    processMemoryAfterBytes,
  };
}

function createRow(input: {
  corpusId: string;
  item: AudioManifestItem;
  sourceHash: string;
  metadata: AudioImplementationMetadata;
  segments: readonly AudioBenchmarkSegmentResult[];
  wholeFileTranscript: string | null;
  stitchDiagnostics: StitchDiagnostics;
  stitchDurationMs: number;
  parity: RecordedProductionRuntimeParity;
  decisionEligible: boolean;
  decisionIneligibility: readonly AudioDecisionIneligibility[];
}): AudioBenchmarkRow {
  const totalDurationMs = input.segments.reduce(
    (total, segment) => total + segment.durationMs,
    input.stitchDurationMs,
  );
  const peakMemoryBytes = input.segments.reduce(
    (peak, segment) =>
      Math.max(
        peak,
        segment.processMemoryBeforeBytes,
        segment.processMemoryAfterBytes,
      ),
    0,
  );
  const hypothesis = input.wholeFileTranscript ?? "";
  return {
    corpusId: input.corpusId,
    corpusItemId: input.item.id,
    sourceHash: input.sourceHash,
    ...input.metadata,
    segments: input.segments,
    wholeFileTranscript: input.wholeFileTranscript,
    stitchDiagnostics: input.stitchDiagnostics,
    score: scoreAsr(input.item.transcriptReference, hypothesis, []),
    totalDurationMs,
    stitchDurationMs: input.stitchDurationMs,
    realTimeFactor: totalDurationMs / input.item.durationMs,
    peakMemoryBytes,
    wholeFileComplete:
      input.wholeFileTranscript !== null &&
      input.segments.every((segment) => segment.failureCode === null) &&
      input.stitchDiagnostics.unresolvedBoundaries === 0,
    productionRuntimeParity: input.parity,
    decisionEligible: input.decisionEligible,
    decisionIneligibility: input.decisionIneligibility,
  };
}

export function resolveAudioBenchmarkPaths(
  repoRoot: string,
  runId: string,
): AudioBenchmarkPaths {
  validateIdentifier(runId, RUN_ID_PATTERN, "Run ID");
  const directory = join(resolve(repoRoot), ".tmp", "benchmarks", runId);
  return {
    directory,
    results: join(directory, "audio-results.jsonl"),
  };
}

export async function runAudioBenchmark(input: {
  readonly repoRoot: string;
  readonly runId: string;
  readonly corpusId: string;
  readonly corpusDecisionEligible: boolean;
  readonly productionRuntimeParity?: ProductionRuntimeParityEvidence;
  readonly items: readonly AudioManifestItem[];
  readonly whisper: CurrentWhisperAdapter;
  readonly gemma: GemmaReferenceAdapter;
  readonly dependencies: AudioBenchmarkDependencies;
}): Promise<AudioBenchmarkResult> {
  validateIdentifier(input.corpusId, CORPUS_ID_PATTERN, "Corpus ID");
  validateImplementations(input.whisper, input.gemma);
  const productionRuntimeParity = validateParityEvidence(
    input.productionRuntimeParity,
  );
  const decision = decisionStatus({
    corpusDecisionEligible: input.corpusDecisionEligible,
    parity: productionRuntimeParity,
  });
  const paths = resolveAudioBenchmarkPaths(input.repoRoot, input.runId);
  await mkdir(join(resolve(input.repoRoot), ".tmp", "benchmarks"), {
    recursive: true,
  });
  await mkdir(paths.directory);

  const rows: AudioBenchmarkRow[] = [];
  let whisperWarmed = false;
  let gemmaWarmed = false;
  for (const item of input.items) {
    const sourceBytes = await input.dependencies.readSource(item.path);
    if (sourceBytes.byteLength > AUDIO_BENCHMARK_POLICY.maxSourceBytes) {
      throw new Error("Audio source exceeds the current pipeline size limit.");
    }
    const sourceHash = createHash("sha256").update(sourceBytes).digest("hex");
    const waveform = validateWaveform(
      await input.dependencies.decodeAudio(sourceBytes),
      item.durationMs,
    );
    const segmentBoundaries = segmentAudio(
      waveform.samples.length,
      AUDIO_BENCHMARK_POLICY.sampleRate,
      {
        windowSeconds: AUDIO_BENCHMARK_POLICY.windowSeconds,
        overlapSeconds: AUDIO_BENCHMARK_POLICY.overlapSeconds,
      },
    );
    const whisperWaveform = waveformView(waveform, 0, waveform.samples.length);

    const whisperPhase: AudioBenchmarkPhase = whisperWarmed ? "warm" : "cold";
    whisperWarmed = true;
    const whisperSegment = await measureSegment({
      segmentIndex: 0,
      startSample: 0,
      endSample: waveform.samples.length,
      phase: whisperPhase,
      maximumCharacters: AUDIO_BENCHMARK_POLICY.maxWholeFileOutputCharacters,
      dependencies: input.dependencies,
      invoke: () =>
        input.whisper.transcribeCompleteWaveform({
          audio: whisperWaveform,
          chunkLengthSeconds: AUDIO_BENCHMARK_POLICY.windowSeconds,
          strideLengthSeconds: AUDIO_BENCHMARK_POLICY.overlapSeconds,
          task: "transcribe",
        }),
    });
    rows.push(
      createRow({
        corpusId: input.corpusId,
        item,
        sourceHash,
        metadata: input.whisper.metadata,
        segments: [whisperSegment],
        wholeFileTranscript: whisperSegment.outputText,
        stitchDiagnostics: zeroStitchDiagnostics(),
        stitchDurationMs: 0,
        parity: productionRuntimeParity,
        ...decision,
      }),
    );

    const gemmaSegments: AudioBenchmarkSegmentResult[] = [];
    for (const [segmentIndex, boundary] of segmentBoundaries.entries()) {
      const phase: AudioBenchmarkPhase = gemmaWarmed ? "warm" : "cold";
      gemmaWarmed = true;
      const audio = waveformView(waveform, boundary.start, boundary.end);
      gemmaSegments.push(
        await measureSegment({
          segmentIndex,
          startSample: boundary.start,
          endSample: boundary.end,
          phase,
          maximumCharacters: AUDIO_BENCHMARK_POLICY.maxSegmentOutputCharacters,
          dependencies: input.dependencies,
          invoke: () =>
            input.gemma.transcribeSegment({
              audio,
              segmentIndex,
              startSample: boundary.start,
              endSample: boundary.end,
            }),
        }),
      );
    }
    const stitchStartedAt = input.dependencies.now();
    const stitched = stitchTranscript(
      gemmaSegments.map((segment) => segment.outputText ?? ""),
    );
    const stitchDurationMs = boundedNumber(
      input.dependencies.now() - stitchStartedAt,
      AUDIO_BENCHMARK_POLICY.maxRecordedDurationMs,
    );
    rows.push(
      createRow({
        corpusId: input.corpusId,
        item,
        sourceHash,
        metadata: input.gemma.metadata,
        segments: gemmaSegments,
        wholeFileTranscript: stitched.text,
        stitchDiagnostics: stitched.diagnostics,
        stitchDurationMs,
        parity: productionRuntimeParity,
        ...decision,
      }),
    );
  }

  await writeFile(
    paths.results,
    `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`,
    { encoding: "utf8", flag: "wx" },
  );
  return {
    paths,
    rows,
    productionRuntimeParity,
    ...decision,
  };
}
