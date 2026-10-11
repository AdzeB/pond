import { describe, expect, test } from "vitest";
import {
  createMediaRetirementReport,
  type MediaRetirementReportInput,
  mediaRetirementReportPath,
} from "./report";

const identities = {
  visionBaseline: {
    implementation: "florence",
    implementationRevision: "pond-florence-v3",
    modelId: "onnx-community/Florence-2-base-ft",
    modelRevision: "abcdef1",
    quantization: "q4",
    runtimeId: "transformers-js",
    runtimeVersion: "4.3.1",
  },
  visionCandidate: {
    implementation: "gemma-vision",
    implementationRevision: "pond-gemma-vision-v1",
    modelId: "gemma4:e2b",
    modelRevision: "sha256:1234abcd",
    quantization: "q4_k_m",
    runtimeId: "ollama",
    runtimeVersion: "0.15.2",
  },
  audioBaseline: {
    implementation: "whisper",
    implementationRevision: "pond-whisper-v2",
    modelId: "onnx-community/whisper-small",
    modelRevision: "abcdef2",
    quantization: "q4",
    runtimeId: "transformers-js",
    runtimeVersion: "4.3.1",
  },
  audioCandidate: {
    implementation: "gemma-audio",
    implementationRevision: "pond-gemma-audio-v1",
    modelId: "google/gemma-3n-E4B-it",
    modelRevision: "abcdef3",
    quantization: "bf16",
    runtimeId: "google-transformers-any-to-any-reference",
    runtimeVersion: "4.57.1",
  },
} as const;

function hardware(
  hardwareClass:
    | "apple-silicon-16gb"
    | "windows-discrete-gpu"
    | "cpu-integrated-fallback",
) {
  return {
    hardwareClass,
    systemId: `${hardwareClass}-fixture`,
    coldLoadMs: 2_000,
    warmP50Ms: 300,
    warmP95Ms: 450,
    throughputUnitsPerSecond: 8.5,
    peakMemoryBytes: 4_000_000_000,
    downloadedBytes: 2_000_000_000,
    cancellation: "passed" as const,
    crashCount: 0,
  };
}

function passingInput(): MediaRetirementReportInput {
  return {
    runId: "media-parity-2026-10-08",
    identities,
    eligibility: {
      visionCorpus: true,
      audioCorpus: true,
      audioRuntimeParity: true,
    },
    importantSlices: {
      vision: ["receipt", "small-text"],
      audio: ["five-minute", "boundary-name"],
    },
    vision: {
      ocr: {
        aggregate: {
          baselineCer: 0.1,
          candidateCer: 0.12,
          baselineWer: 0.15,
          candidateWer: 0.17,
        },
        slices: {
          receipt: {
            baselineCer: 0.12,
            candidateCer: 0.16,
            baselineWer: 0.15,
            candidateWer: 0.19,
          },
          "small-text": {
            baselineCer: 0.18,
            candidateCer: 0.22,
            baselineWer: 0.2,
            candidateWer: 0.25,
          },
        },
      },
      captions: {
        tiesOrCandidateWins: 80,
        comparisons: 100,
        baselineUnsupportedClaims: 3,
        baselineClaimsEvaluated: 100,
        candidateUnsupportedClaims: 3,
        candidateClaimsEvaluated: 100,
      },
    },
    audio: {
      aggregate: { baselineNormalizedWer: 0.12, candidateNormalizedWer: 0.14 },
      slices: {
        "five-minute": {
          baselineNormalizedWer: 0.1,
          candidateNormalizedWer: 0.14,
        },
        "boundary-name": {
          baselineNormalizedWer: 0.2,
          candidateNormalizedWer: 0.24,
        },
      },
      boundaries: {
        omissions: 4,
        duplications: 5,
        referenceWords: 1_000,
      },
      completion: {
        baselineComplete: 98,
        baselineFiles: 100,
        candidateComplete: 98,
        candidateFiles: 100,
      },
    },
    hardware: {
      "apple-silicon-16gb": hardware("apple-silicon-16gb"),
      "windows-discrete-gpu": hardware("windows-discrete-gpu"),
      "cpu-integrated-fallback": hardware("cpu-integrated-fallback"),
    },
  };
}

function requireVision(input: MediaRetirementReportInput) {
  if (input.vision === undefined) throw new Error("Fixture requires vision.");
  return input.vision;
}

function requireAudio(input: MediaRetirementReportInput) {
  if (input.audio === undefined) throw new Error("Fixture requires audio.");
  return input.audio;
}

function requireOcrSlice(input: MediaRetirementReportInput, slice: string) {
  const stats = requireVision(input).ocr.slices[slice];
  if (stats === undefined) throw new Error("Fixture requires OCR slice.");
  return stats;
}

function requireAudioSlice(input: MediaRetirementReportInput, slice: string) {
  const stats = requireAudio(input).slices[slice];
  if (stats === undefined) throw new Error("Fixture requires audio slice.");
  return stats;
}

function requireHardware(
  input: MediaRetirementReportInput,
  hardwareClass: keyof MediaRetirementReportInput["hardware"],
) {
  const stats = input.hardware[hardwareClass];
  if (stats === undefined) throw new Error("Fixture requires hardware stats.");
  return stats;
}

describe("media retirement gates", () => {
  test("passes the exact vision and audio boundary values", () => {
    const report = createMediaRetirementReport(passingInput());

    expect(report.decision.vision).toEqual({
      status: "pass",
      disposition: "eligible-to-retire-florence",
    });
    expect(report.decision.audio).toEqual({
      status: "pass",
      disposition: "eligible-to-retire-whisper",
    });
    expect(report.gates.map(({ status }) => status)).not.toContain("fail");
    expect(report.markdown).toContain("80.00%");
    expect(report.markdown).toContain("0.90%");
  });

  test("fails values just outside every fixed quality gate", () => {
    const input = passingInput();
    requireVision(input).ocr.aggregate.candidateCer = 0.120_001;
    requireOcrSlice(input, "receipt").candidateWer = 0.200_001;
    requireVision(input).captions.tiesOrCandidateWins = 79;
    requireVision(input).captions.candidateUnsupportedClaims = 4;
    requireAudio(input).aggregate.candidateNormalizedWer = 0.140_001;
    requireAudioSlice(input, "five-minute").candidateNormalizedWer = 0.140_001;
    requireAudio(input).boundaries.duplications = 6;
    requireAudio(input).completion.candidateComplete = 97;

    const report = createMediaRetirementReport(input);

    expect(report.decision.vision).toEqual({
      status: "fail",
      disposition: "keep-florence",
    });
    expect(report.decision.audio).toEqual({
      status: "fail",
      disposition: "keep-whisper",
    });
    expect(report.gates.filter(({ status }) => status === "fail")).toHaveLength(
      8,
    );
  });

  test("never passes missing, non-finite, or ineligible evidence", () => {
    const input = passingInput();
    requireVision(input).ocr.aggregate.candidateCer = Number.NaN;
    input.audio = undefined;
    input.eligibility.visionCorpus = false;
    input.eligibility.audioRuntimeParity = false;
    requireHardware(input, "apple-silicon-16gb").coldLoadMs = undefined;
    delete input.hardware["windows-discrete-gpu"];

    const report = createMediaRetirementReport(input);

    expect(report.decision.vision).toEqual({
      status: "not-evaluated",
      disposition: "keep-florence",
    });
    expect(report.decision.audio).toEqual({
      status: "not-evaluated",
      disposition: "keep-whisper",
    });
    expect(report.markdown).toContain("NOT EVALUATED");
    expect(report.markdown).toContain("Apple Silicon 16 GB | Missing");
    expect(report.markdown).toContain("Windows discrete GPU | Missing");
  });

  test("requires every declared important slice", () => {
    const input = passingInput();
    delete requireVision(input).ocr.slices["small-text"];
    delete requireAudio(input).slices["boundary-name"];

    const report = createMediaRetirementReport(input);

    expect(report.decision.vision.status).toBe("not-evaluated");
    expect(report.decision.audio.status).toBe("not-evaluated");
  });
});

describe("redacted report", () => {
  test("contains identities, aggregate and slice stats, and every hardware metric", () => {
    const report = createMediaRetirementReport(passingInput());

    expect(report.markdown).toContain("gemma4:e2b");
    expect(report.markdown).toContain("sha256:1234abcd");
    expect(report.markdown).toContain("q4_k_m");
    expect(report.markdown).toContain("Apple Silicon 16 GB");
    expect(report.markdown).toContain("Cold load");
    expect(report.markdown).toContain("Warm p50 / p95");
    expect(report.markdown).toContain("Throughput");
    expect(report.markdown).toContain("Peak memory");
    expect(report.markdown).toContain("Downloaded bytes");
    expect(report.markdown).toContain("Cancellation");
    expect(report.markdown).toContain("Crash count");
    expect(report.markdown).toContain("receipt");
    expect(report.markdown).toContain("boundary-name");
  });

  test("omits unrecognized private fields from structured input", () => {
    const input = Object.assign(passingInput(), {
      prompt: "PRIVATE PROMPT",
      credential: "sk-secret",
      absoluteSourcePath: "/Users/person/private/receipt.png",
      fullTranscript: "PRIVATE TRANSCRIPT",
      arbitraryError: "server leaked a private path",
    });

    const report = createMediaRetirementReport(input);

    expect(report.markdown).not.toMatch(
      /PRIVATE|sk-secret|\/Users\/person|server leaked/u,
    );
  });

  test("rejects path-like or secret-like values in rendered identity fields", () => {
    const pathInput = passingInput();
    pathInput.identities.visionCandidate.modelRevision =
      "/Users/person/private/model";
    expect(() => createMediaRetirementReport(pathInput)).toThrow(
      /safe identifier/u,
    );

    const secretInput = passingInput();
    secretInput.identities.audioCandidate.runtimeVersion = "sk-secret-value";
    expect(() => createMediaRetirementReport(secretInput)).toThrow(
      /safe identifier/u,
    );
  });

  test("returns only a validated ignored report path for the caller", () => {
    expect(mediaRetirementReportPath("media-parity-2026-10-08")).toBe(
      ".tmp/benchmarks/media-parity-2026-10-08/decision-report.md",
    );
    expect(() => mediaRetirementReportPath("../private")).toThrow(/run ID/u);
  });
});
