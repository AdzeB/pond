import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { JsonValue } from "@pond/schema/json";
import { describe, expect, test } from "vitest";
import { z } from "zod";
import type { VisionManifestItem } from "./manifest";
import {
  type CanonicalVisionImage,
  resolveVisionBenchmarkPaths,
  runVisionBenchmark,
  VISION_BENCHMARK_POLICY,
  VISION_TASK_CONFIG,
  type VisionBenchmarkImplementation,
  type VisionBenchmarkInvocation,
} from "./run-vision";

const item: VisionManifestItem = {
  id: "receipt-001",
  kind: "vision",
  path: "/private/corpus/receipt.png",
  slices: ["receipt", "small-text"],
  ocrReference: "TOTAL 12.50",
  mustMention: ["receipt"],
  forbiddenClaims: ["restaurant name"],
};

function implementation(input: {
  implementation: "florence" | "gemma";
  role: "baseline" | "candidate";
  sampling: "deterministic" | "stochastic";
  invocations: VisionBenchmarkInvocation[];
}): VisionBenchmarkImplementation {
  return {
    metadata: {
      implementation: input.implementation,
      implementationRevision: `${input.implementation}-adapter-v1`,
      modelId: `${input.implementation}-model`,
      modelRevision: `${input.implementation}-revision`,
      modelTag: `${input.implementation}:pinned`,
      quantization: "q4_k_m",
      role: input.role,
      sampling:
        input.sampling === "deterministic"
          ? { mode: "deterministic" }
          : { mode: "stochastic", temperature: 0.2 },
    },
    async run(invocation) {
      input.invocations.push(invocation);
      return {
        text: `${input.implementation}-${invocation.task}-${invocation.runIndex}`,
      };
    },
  };
}

function parseJsonl(text: string): Array<Record<string, JsonValue>> {
  return text
    .trim()
    .split("\n")
    .map((line) => z.record(z.string(), z.json()).parse(JSON.parse(line)));
}

describe("vision benchmark runner", () => {
  test("reads and decodes once, then gives both implementations identical immutable pixels and prompts", async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), "pond-vision-benchmark-"));
    const sourceBytes = new Uint8Array([9, 4, 2, 7]);
    const canonical: CanonicalVisionImage = {
      width: 1,
      height: 1,
      pixelFormat: "rgba8",
      pixelsBase64: "CQQLBw==",
    };
    let reads = 0;
    let decodes = 0;
    const florenceInvocations: VisionBenchmarkInvocation[] = [];
    const gemmaInvocations: VisionBenchmarkInvocation[] = [];

    const result = await runVisionBenchmark({
      repoRoot,
      runId: "vision-run-01",
      corpusId: "private-corpus-v1",
      items: [item],
      blindSeed: "seed-42",
      implementations: [
        implementation({
          implementation: "florence",
          role: "baseline",
          sampling: "deterministic",
          invocations: florenceInvocations,
        }),
        implementation({
          implementation: "gemma",
          role: "candidate",
          sampling: "stochastic",
          invocations: gemmaInvocations,
        }),
      ],
      dependencies: {
        async readSource(path) {
          reads += 1;
          expect(path).toBe(item.path);
          return sourceBytes;
        },
        async decodeImage(bytes) {
          decodes += 1;
          expect(bytes).toBe(sourceBytes);
          return canonical;
        },
        now: (() => {
          let value = 100;
          return () => value++;
        })(),
        memoryBytes: (() => {
          let value = 1_000;
          return () => value++;
        })(),
      },
    });

    expect(reads).toBe(1);
    expect(decodes).toBe(1);
    expect(result.rows).toHaveLength(8);
    expect(florenceInvocations).toHaveLength(2);
    expect(gemmaInvocations).toHaveLength(6);
    const invocations = [...florenceInvocations, ...gemmaInvocations];
    expect(
      invocations.every((entry) => entry.image === invocations[0]?.image),
    ).toBe(true);
    expect(Object.isFrozen(invocations[0]?.image)).toBe(true);
    expect(
      invocations.every(
        (entry) =>
          entry.prompt === VISION_TASK_CONFIG[entry.task].prompt &&
          entry.promptVersion === VISION_TASK_CONFIG[entry.task].promptVersion,
      ),
    ).toBe(true);
    expect(VISION_BENCHMARK_POLICY).toEqual({
      deterministicRuns: 1,
      stochasticCandidateRuns: 3,
      stochasticBaseline: "unsupported",
    });
  });

  test("writes bounded path-free result rows with source hashes, pinned metadata, phase, and memory", async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), "pond-vision-results-"));
    const invocations: VisionBenchmarkInvocation[] = [];
    const paths = resolveVisionBenchmarkPaths(repoRoot, "vision-output-01");
    const result = await runVisionBenchmark({
      repoRoot,
      runId: "vision-output-01",
      corpusId: "private-corpus-v1",
      items: [{ ...item, mustMention: undefined }],
      blindSeed: "seed",
      implementations: [
        implementation({
          implementation: "florence",
          role: "baseline",
          sampling: "deterministic",
          invocations,
        }),
        implementation({
          implementation: "gemma",
          role: "candidate",
          sampling: "deterministic",
          invocations,
        }),
      ],
      dependencies: {
        async readSource() {
          return new Uint8Array([1, 2, 3]);
        },
        async decodeImage() {
          return {
            width: 1,
            height: 1,
            pixelFormat: "rgba8",
            pixelsBase64: "AQIDBA==",
          };
        },
        now: (() => {
          const values = [10, 15, 20, 28];
          return () => values.shift() ?? 28;
        })(),
        memoryBytes: (() => {
          const values = [100, 150, 200, 180];
          return () => values.shift() ?? 180;
        })(),
      },
    });

    const rows = parseJsonl(await readFile(paths.results, "utf8"));
    expect(result.paths).toEqual(paths);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      corpusId: "private-corpus-v1",
      corpusItemId: "receipt-001",
      sourceHash:
        "039058c6f2c0cb492c533b0a4d14ef77cc0f78abccced5287d84a1a2011cfb81",
      implementation: "florence",
      implementationRevision: "florence-adapter-v1",
      modelId: "florence-model",
      modelRevision: "florence-revision",
      modelTag: "florence:pinned",
      quantization: "q4_k_m",
      promptVersion: VISION_TASK_CONFIG.ocr.promptVersion,
      outputText: "florence-ocr-1",
      durationMs: 5,
      phase: "cold",
      processMemoryBeforeBytes: 100,
      processMemoryAfterBytes: 150,
      failureCode: null,
    });
    expect(JSON.stringify(rows)).not.toContain(item.path);
    expect(JSON.stringify(rows)).not.toContain("pixelsBase64");
  });

  test("records only bounded failures and rejects unsupported stochastic baselines", async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), "pond-vision-failure-"));
    const stochasticBaseline = implementation({
      implementation: "florence",
      role: "baseline",
      sampling: "stochastic",
      invocations: [],
    });
    const candidate = implementation({
      implementation: "gemma",
      role: "candidate",
      sampling: "deterministic",
      invocations: [],
    });
    const dependencies = {
      async readSource() {
        return new Uint8Array([1]);
      },
      async decodeImage() {
        return {
          width: 1,
          height: 1,
          pixelFormat: "rgba8" as const,
          pixelsBase64: "AAAAAA==",
        };
      },
      now: () => 1,
      memoryBytes: () => 1,
    };

    await expect(
      runVisionBenchmark({
        repoRoot,
        runId: "bad-policy",
        corpusId: "private-corpus-v1",
        items: [item],
        blindSeed: "seed",
        implementations: [stochasticBaseline, candidate],
        dependencies,
      }),
    ).rejects.toThrow(/stochastic baseline/i);

    const failingCandidate: VisionBenchmarkImplementation = {
      ...candidate,
      async run() {
        throw new Error("private path: /Users/example/secret.png");
      },
    };
    const result = await runVisionBenchmark({
      repoRoot,
      runId: "bounded-failure",
      corpusId: "private-corpus-v1",
      items: [{ ...item, mustMention: undefined }],
      blindSeed: "seed",
      implementations: [
        implementation({
          implementation: "florence",
          role: "baseline",
          sampling: "deterministic",
          invocations: [],
        }),
        failingCandidate,
      ],
      dependencies,
    });
    const failed = result.rows.find((row) => row.implementation === "gemma");
    expect(failed).toMatchObject({
      outputText: null,
      failureCode: "inference-failed",
    });
    expect(JSON.stringify(failed)).not.toContain("private path");
  });

  test("exports seeded anonymous caption rows and keeps identities only in a reproducible key", async () => {
    async function run(runId: string) {
      const repoRoot = await mkdtemp(join(tmpdir(), "pond-vision-blind-"));
      const invocations: VisionBenchmarkInvocation[] = [];
      const florence = implementation({
        implementation: "florence",
        role: "baseline",
        sampling: "deterministic",
        invocations,
      });
      const gemma = implementation({
        implementation: "gemma",
        role: "candidate",
        sampling: "stochastic",
        invocations,
      });
      const result = await runVisionBenchmark({
        repoRoot,
        runId,
        corpusId: "caption-corpus-v1",
        items: [{ ...item, ocrReference: undefined }],
        blindSeed: "review-seed-2026",
        implementations: [
          { ...florence, run: async () => ({ text: "A bicycle by a wall." }) },
          {
            ...gemma,
            run: async (invocation) => ({
              text: `A red bicycle by a wall, take ${invocation.runIndex}.`,
            }),
          },
        ],
        dependencies: {
          async readSource() {
            return new Uint8Array([5]);
          },
          async decodeImage() {
            return {
              width: 1,
              height: 1,
              pixelFormat: "rgba8",
              pixelsBase64: "AAAAAA==",
            };
          },
          now: () => 1,
          memoryBytes: () => 1,
        },
      });
      return {
        evaluator: await readFile(result.paths.captionEvaluator, "utf8"),
        key: await readFile(result.paths.captionKey, "utf8"),
      };
    }

    const first = await run("blind-run-one");
    const second = await run("blind-run-two");
    expect(first).toEqual(second);
    const evaluator = parseJsonl(first.evaluator);
    const key = parseJsonl(first.key);
    expect(evaluator[0]).toEqual({
      kind: "metadata",
      corpusId: "caption-corpus-v1",
      seed: "review-seed-2026",
    });
    expect(evaluator[1]).toMatchObject({
      kind: "caption",
      corpusId: "caption-corpus-v1",
      corpusItemId: "receipt-001",
      mustMention: ["receipt"],
      forbiddenClaims: ["restaurant name"],
    });
    expect(evaluator[1]?.outputs).toHaveLength(4);
    expect(first.evaluator).not.toMatch(
      /florence|gemma|modelId|modelRevision|implementation/i,
    );
    expect(key[1]).toMatchObject({
      kind: "identity",
      corpusId: "caption-corpus-v1",
      corpusItemId: "receipt-001",
    });
    expect(first.key).toMatch(/florence/);
    expect(first.key).toMatch(/gemma/);
  });

  test("rejects output escapes and never overwrites an existing run", async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), "pond-vision-paths-"));
    expect(() => resolveVisionBenchmarkPaths(repoRoot, "../escape")).toThrow(
      /run ID/i,
    );
    const input = {
      repoRoot,
      runId: "same-run",
      corpusId: "private-corpus-v1",
      items: [{ ...item, mustMention: undefined }],
      blindSeed: "seed",
      implementations: [
        implementation({
          implementation: "florence" as const,
          role: "baseline" as const,
          sampling: "deterministic" as const,
          invocations: [],
        }),
        implementation({
          implementation: "gemma" as const,
          role: "candidate" as const,
          sampling: "deterministic" as const,
          invocations: [],
        }),
      ],
      dependencies: {
        async readSource() {
          return new Uint8Array([1]);
        },
        async decodeImage() {
          return {
            width: 1,
            height: 1,
            pixelFormat: "rgba8" as const,
            pixelsBase64: "AAAAAA==",
          };
        },
        now: () => 1,
        memoryBytes: () => 1,
      },
    };
    await runVisionBenchmark(input);
    await expect(runVisionBenchmark(input)).rejects.toThrow();
  });
});
