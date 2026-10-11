import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import type { AudioManifestItem } from "./manifest";
import {
  AUDIO_BENCHMARK_POLICY,
  type AudioBenchmarkDependencies,
  type CurrentWhisperAdapter,
  type GemmaReferenceAdapter,
  type GemmaSegmentInvocation,
  resolveAudioBenchmarkPaths,
  runAudioBenchmark,
  type WhisperWaveformInvocation,
} from "./run-audio";

const overlappingWords =
  "one two three four five six seven eight nine ten eleven";

function audioItem(durationMs = 31_000): AudioManifestItem {
  return {
    id: "meeting-001",
    kind: "audio",
    path: "/private/corpus/meeting.wav",
    slices: ["meeting", "boundary-name"],
    durationMs,
    transcriptReference: overlappingWords,
  };
}

function whisperAdapter(input: {
  invocations: WhisperWaveformInvocation[];
  run?: CurrentWhisperAdapter["transcribeCompleteWaveform"];
}): CurrentWhisperAdapter {
  return {
    metadata: {
      implementation: "whisper",
      implementationRevision: "pond-whisper-adapter-v1",
      runtime: "pond-current-whisper-pipeline",
      runtimeVersion: "transformers-js-worker-v1",
      library: "@huggingface/transformers",
      libraryVersion: "4.3.0",
      modelId: "onnx-community/whisper-base",
      modelRevision: "1846881b6b3a3024392c1eea3ad983695bc23925",
      quantization: "webgpu-fp16-or-wasm-q8",
    },
    async transcribeCompleteWaveform(invocation) {
      input.invocations.push(invocation);
      if (input.run !== undefined) return input.run(invocation);
      return { text: overlappingWords };
    },
  };
}

function gemmaAdapter(input: {
  invocations: GemmaSegmentInvocation[];
  run?: GemmaReferenceAdapter["transcribeSegment"];
  runtime?: string;
}): GemmaReferenceAdapter {
  return {
    metadata: {
      implementation: "gemma",
      implementationRevision: "pond-gemma-reference-adapter-v1",
      runtime: input.runtime ?? "google-transformers-any-to-any-reference",
      runtimeVersion: "python-3.13.7",
      library: "transformers",
      libraryVersion: "5.0.0",
      modelId: "google/gemma-4-E2B-it",
      modelRevision: "pinned-gemma-revision",
      quantization: "bfloat16",
    },
    async transcribeSegment(invocation) {
      input.invocations.push(invocation);
      if (input.run !== undefined) return input.run(invocation);
      return {
        text:
          invocation.segmentIndex === 0
            ? "one two three four five six seven eight nine ten"
            : overlappingWords,
      };
    },
  };
}

function dependencies(input: {
  samples: Float32Array;
  durationMs: number;
  onRead?: () => void;
  onDecode?: () => void;
}): AudioBenchmarkDependencies {
  let tick = 0;
  return {
    async readSource(path) {
      expect(path).toBe("/private/corpus/meeting.wav");
      input.onRead?.();
      return new Uint8Array([9, 4, 2, 7]);
    },
    async decodeAudio(bytes) {
      expect(bytes).toEqual(new Uint8Array([9, 4, 2, 7]));
      input.onDecode?.();
      return {
        sampleRate: 16_000,
        channels: 1,
        samples: input.samples,
        durationMs: input.durationMs,
      };
    },
    now: () => {
      tick += 10;
      return tick;
    },
    memoryBytes: () => {
      tick += 100;
      return 1_000 + tick;
    },
  };
}

describe("audio benchmark runner", () => {
  test("decodes once and gives Whisper the complete canonical waveform while Gemma receives deterministic segments from it", async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), "pond-audio-benchmark-"));
    const samples = new Float32Array(31 * 16_000);
    samples[0] = 0.25;
    samples[samples.length - 1] = -0.5;
    const whisperInvocations: WhisperWaveformInvocation[] = [];
    const gemmaInvocations: GemmaSegmentInvocation[] = [];
    let reads = 0;
    let decodes = 0;

    const result = await runAudioBenchmark({
      repoRoot,
      runId: "audio-run-01",
      corpusId: "private-audio-v1",
      corpusDecisionEligible: true,
      items: [audioItem()],
      whisper: whisperAdapter({ invocations: whisperInvocations }),
      gemma: gemmaAdapter({ invocations: gemmaInvocations }),
      dependencies: dependencies({
        samples,
        durationMs: 31_000,
        onRead: () => {
          reads += 1;
        },
        onDecode: () => {
          decodes += 1;
        },
      }),
    });

    expect(reads).toBe(1);
    expect(decodes).toBe(1);
    expect(whisperInvocations).toHaveLength(1);
    expect(whisperInvocations[0]).toMatchObject({
      chunkLengthSeconds: 30,
      strideLengthSeconds: 5,
      task: "transcribe",
    });
    expect(whisperInvocations[0]?.audio.samples).not.toBe(samples);
    expect(whisperInvocations[0]?.audio.samples.length).toBe(samples.length);
    expect(whisperInvocations[0]?.audio.samples[0]).toBe(0.25);
    expect(whisperInvocations[0]?.audio.samples[samples.length - 1]).toBe(-0.5);
    expect(gemmaInvocations).toHaveLength(2);
    expect(
      gemmaInvocations.map(
        ({ segmentIndex, startSample, endSample, audio }) => ({
          segmentIndex,
          startSample,
          endSample,
          sampleLength: audio.samples.length,
          sharesCanonicalBuffer: audio.samples.buffer === samples.buffer,
        }),
      ),
    ).toEqual([
      {
        segmentIndex: 0,
        startSample: 0,
        endSample: 480_000,
        sampleLength: 480_000,
        sharesCanonicalBuffer: false,
      },
      {
        segmentIndex: 1,
        startSample: 400_000,
        endSample: 496_000,
        sampleLength: 96_000,
        sharesCanonicalBuffer: false,
      },
    ]);
    const whisper = result.rows.find((row) => row.implementation === "whisper");
    const gemma = result.rows.find((row) => row.implementation === "gemma");
    expect(whisper).toMatchObject({
      sourceHash:
        "4384c0bc745d657274de3e6b45107fcfcf761f104fde0b61f75847e72a879061",
      wholeFileTranscript: overlappingWords,
      wholeFileComplete: true,
      decisionEligible: false,
      decisionIneligibility: [
        "production-runtime-fixture-parity-not-evidenced",
      ],
    });
    expect(gemma).toMatchObject({
      wholeFileTranscript: overlappingWords,
      wholeFileComplete: true,
      stitchDiagnostics: {
        overlapWords: 10,
        droppedDuplicateWords: 10,
        unresolvedBoundaries: 0,
      },
      decisionEligible: false,
      decisionIneligibility: [
        "production-runtime-fixture-parity-not-evidenced",
      ],
    });
    expect(gemma?.segments.map((segment) => segment.phase)).toEqual([
      "cold",
      "warm",
    ]);
    expect(whisper?.segments).toHaveLength(1);
    expect(gemma?.score.punctuationSensitive.wer.rate).toBe(0);
    expect(gemma?.score.normalized.cer.rate).toBe(0);
    expect(gemma?.realTimeFactor).toBeGreaterThanOrEqual(0);
    expect(gemma?.peakMemoryBytes).toBeGreaterThan(0);
  });

  test("isolates both implementations from mutations while decoding only once", async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), "pond-audio-isolation-"));
    const samples = new Float32Array(16_000);
    samples[0] = 0.25;
    let decodes = 0;
    const gemmaFirstSamples: number[] = [];

    await runAudioBenchmark({
      repoRoot,
      runId: "adapter-isolation",
      corpusId: "private-audio-v1",
      corpusDecisionEligible: false,
      items: [audioItem(1_000)],
      whisper: whisperAdapter({
        invocations: [],
        async run(invocation) {
          invocation.audio.samples[0] = 1;
          return { text: overlappingWords };
        },
      }),
      gemma: gemmaAdapter({
        invocations: [],
        async run(invocation) {
          gemmaFirstSamples.push(invocation.audio.samples[0] ?? 0);
          invocation.audio.samples[0] = -1;
          return { text: overlappingWords };
        },
      }),
      dependencies: dependencies({
        samples,
        durationMs: 1_000,
        onDecode: () => {
          decodes += 1;
        },
      }),
    });

    expect(decodes).toBe(1);
    expect(gemmaFirstSamples).toEqual([0.25]);
    expect(samples[0]).toBe(0.25);
  });

  test("preserves a failed Gemma segment as an unresolved boundary and marks the whole file incomplete", async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), "pond-audio-failure-"));
    const durationMs = 56_000;
    const item = audioItem(durationMs);
    const result = await runAudioBenchmark({
      repoRoot,
      runId: "failed-segment",
      corpusId: "private-audio-v1",
      corpusDecisionEligible: false,
      items: [item],
      whisper: whisperAdapter({ invocations: [] }),
      gemma: gemmaAdapter({
        invocations: [],
        async run(invocation) {
          if (invocation.segmentIndex === 1) {
            throw new Error(
              "private source /Users/example/audio.wav with API_KEY=secret",
            );
          }
          return { text: `segment ${invocation.segmentIndex}` };
        },
      }),
      dependencies: dependencies({
        samples: new Float32Array(56 * 16_000),
        durationMs,
      }),
    });

    const gemma = result.rows.find((row) => row.implementation === "gemma");
    expect(gemma?.segments).toHaveLength(3);
    expect(gemma?.segments[1]).toMatchObject({
      outputText: null,
      failureCode: "inference-failed",
    });
    expect(gemma?.wholeFileTranscript).toContain(
      "[[UNRESOLVED AUDIO BOUNDARY]]",
    );
    expect(gemma?.stitchDiagnostics.unresolvedBoundaries).toBeGreaterThan(0);
    expect(gemma?.wholeFileComplete).toBe(false);
    expect(JSON.stringify(gemma)).not.toMatch(
      /Users\/example|API_KEY|secret|audio\.wav/,
    );
  });

  test("writes path-free bounded rows only inside an exclusive validated run directory", async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), "pond-audio-results-"));
    const paths = resolveAudioBenchmarkPaths(repoRoot, "audio-output-01");
    const input = {
      repoRoot,
      runId: "audio-output-01",
      corpusId: "private-audio-v1",
      corpusDecisionEligible: true,
      items: [audioItem()],
      whisper: whisperAdapter({ invocations: [] }),
      gemma: gemmaAdapter({ invocations: [] }),
      dependencies: dependencies({
        samples: new Float32Array(31 * 16_000),
        durationMs: 31_000,
      }),
    };

    const result = await runAudioBenchmark(input);
    const written = await readFile(paths.results, "utf8");
    expect(result.paths).toEqual(paths);
    expect(written.trim().split("\n")).toHaveLength(2);
    expect(written).not.toContain("/private/corpus");
    expect(written).not.toContain("meeting.wav");
    expect(written).not.toContain("samples");
    expect(written).toContain(
      '"runtime":"google-transformers-any-to-any-reference"',
    );
    expect(written).toContain('"libraryVersion":"5.0.0"');
    expect(written).toContain('"modelRevision":"pinned-gemma-revision"');
    expect(written).toContain('"quantization":"bfloat16"');
    await expect(runAudioBenchmark(input)).rejects.toThrow();
    expect(() => resolveAudioBenchmarkPaths(repoRoot, "../escape")).toThrow(
      /run ID/i,
    );
  });

  test("keeps rows ineligible until explicit production-runtime fixture parity is supplied", async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), "pond-audio-parity-"));
    const result = await runAudioBenchmark({
      repoRoot,
      runId: "parity-evidenced",
      corpusId: "private-audio-v1",
      corpusDecisionEligible: true,
      productionRuntimeParity: {
        candidateRuntimeId: "future-runtime-under-test",
        candidateRuntimeVersion: "1.2.3",
        fixtureSetId: "audio-parity-fixtures-v1",
        evidenceHash:
          "5c6c6f8d7f0b7f4497708cd3b7efb609488f9169b9451edc33282982d18799b0",
      },
      items: [audioItem()],
      whisper: whisperAdapter({ invocations: [] }),
      gemma: gemmaAdapter({ invocations: [] }),
      dependencies: dependencies({
        samples: new Float32Array(31 * 16_000),
        durationMs: 31_000,
      }),
    });

    expect(result.decisionEligible).toBe(true);
    expect(result.rows.every((row) => row.decisionEligible)).toBe(true);
    expect(result.rows[0]?.productionRuntimeParity).toMatchObject({
      status: "evidenced",
      candidateRuntimeId: "future-runtime-under-test",
      fixtureSetId: "audio-parity-fixtures-v1",
    });
  });

  test("rejects non-canonical waveforms, inconsistent duration, and unpinned reference metadata", async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), "pond-audio-validation-"));
    const baseInput = {
      repoRoot,
      corpusId: "private-audio-v1",
      corpusDecisionEligible: false,
      items: [audioItem(1_000)],
      whisper: whisperAdapter({ invocations: [] }),
      gemma: gemmaAdapter({ invocations: [] }),
    };

    await expect(
      runAudioBenchmark({
        ...baseInput,
        runId: "wrong-rate",
        dependencies: {
          ...dependencies({
            samples: new Float32Array(16_000),
            durationMs: 1_000,
          }),
          async decodeAudio() {
            return {
              sampleRate: 48_000,
              channels: 1,
              samples: new Float32Array(48_000),
              durationMs: 1_000,
            };
          },
        },
      }),
    ).rejects.toThrow(/16 kHz mono Float32/i);

    const nonFinite = new Float32Array(16_000);
    nonFinite[4] = Number.NaN;
    await expect(
      runAudioBenchmark({
        ...baseInput,
        runId: "non-finite",
        dependencies: dependencies({
          samples: nonFinite,
          durationMs: 1_000,
        }),
      }),
    ).rejects.toThrow(/finite samples/i);

    await expect(
      runAudioBenchmark({
        ...baseInput,
        runId: "duration-mismatch",
        dependencies: dependencies({
          samples: new Float32Array(16_000),
          durationMs: 1_100,
        }),
      }),
    ).rejects.toThrow(/duration/i);

    const wrongRuntime = gemmaAdapter({
      invocations: [],
      runtime: "unproven-local-runtime",
    });
    await expect(
      runAudioBenchmark({
        ...baseInput,
        runId: "wrong-reference-runtime",
        gemma: wrongRuntime,
        dependencies: dependencies({
          samples: new Float32Array(16_000),
          durationMs: 1_000,
        }),
      }),
    ).rejects.toThrow(/Google.*Transformers any-to-any reference/i);
  });

  test("bounds adapter output and records a closed failure code", async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), "pond-audio-bounds-"));
    const result = await runAudioBenchmark({
      repoRoot,
      runId: "bounded-output",
      corpusId: "private-audio-v1",
      corpusDecisionEligible: false,
      items: [audioItem(1_000)],
      whisper: whisperAdapter({
        invocations: [],
        async run() {
          return {
            text: "x".repeat(
              AUDIO_BENCHMARK_POLICY.maxWholeFileOutputCharacters + 1,
            ),
          };
        },
      }),
      gemma: gemmaAdapter({
        invocations: [],
        async run() {
          return {
            text: "x".repeat(
              AUDIO_BENCHMARK_POLICY.maxSegmentOutputCharacters + 1,
            ),
          };
        },
      }),
      dependencies: dependencies({
        samples: new Float32Array(16_000),
        durationMs: 1_000,
      }),
    });

    expect(
      result.rows.flatMap((row) => row.segments).map((row) => row.failureCode),
    ).toEqual(["output-too-long", "output-too-long"]);
    expect(result.rows.every((row) => !row.wholeFileComplete)).toBe(true);
  });
});
