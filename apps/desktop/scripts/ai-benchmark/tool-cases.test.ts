import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import {
  findDuplicatesInput,
  readSaveInput,
  searchLibraryInput,
} from "../../src/main/core/agent/tools";
import {
  assistantProposalInput,
  assistantQuestion,
} from "../../src/shared/assistant";
import {
  BENCHMARK_TOOL_SCHEMAS,
  TOOL_CASE_CATEGORIES,
  TOOL_CASES,
} from "./tool-cases";
import {
  type BenchmarkObservation,
  type BenchmarkSummary,
  decideFunctionGemmaAdoption,
  parseToolBenchmarkArguments,
  resolveBenchmarkOutputPath,
  scoreBenchmark,
  writeBenchmarkJsonl,
} from "./tool-routing-benchmark";

const canonicalSchemas = {
  findDuplicates: findDuplicatesInput,
  proposeChanges: assistantProposalInput,
  readSave: readSaveInput,
  requestQuestion: assistantQuestion,
  searchLibrary: searchLibraryInput,
};

const gateCaseIds = Array.from(
  { length: 100 },
  (_, index) => `gate-case-${index + 1}`,
);

function observed(
  caseId: string,
  input: Partial<BenchmarkObservation> = {},
): BenchmarkObservation {
  return {
    caseId,
    modelId: "benchmark-model",
    provider: "ollama",
    phase: "warm",
    latencyMs: 50,
    memoryBytes: 100,
    calls: [],
    outcome: "ok",
    ...input,
  };
}

function summary(input: Partial<BenchmarkSummary> = {}): BenchmarkSummary {
  return {
    modelId: "model",
    provider: "ollama",
    caseIds: gateCaseIds,
    totalCases: gateCaseIds.length,
    observedCases: gateCaseIds.length,
    exactToolSelections: gateCaseIds.length,
    schemaValidSelections: gateCaseIds.length,
    exactValidToolCalls: 50,
    exactValidToolCallRate: 0.5,
    forbiddenAttemptCount: 0,
    forbiddenAttemptRate: 0,
    clarificationRequired: 0,
    correctClarifications: 0,
    clarificationSuccessRate: null,
    observedClarificationRate: 0,
    coldLoadMs: 1_000,
    warmLatencyP50Ms: 100,
    warmLatencyP95Ms: 100,
    peakMemoryBytes: 1_000,
    ...input,
  };
}

describe("Pond tool-routing corpus", () => {
  test("exports at least 100 unique cases with balanced required coverage", () => {
    expect(TOOL_CASES.length).toBeGreaterThanOrEqual(100);
    expect(Object.isFrozen(TOOL_CASES)).toBe(true);
    expect(new Set(TOOL_CASES.map((entry) => entry.id)).size).toBe(
      TOOL_CASES.length,
    );
    expect(new Set(TOOL_CASES.map((entry) => entry.prompt)).size).toBe(
      TOOL_CASES.length,
    );

    for (const category of TOOL_CASE_CATEGORIES) {
      expect(
        TOOL_CASES.filter((entry) => entry.category === category).length,
      ).toBeGreaterThanOrEqual(15);
    }
  });

  test("uses stable IDs, explicit safety boundaries, and no private fixtures", () => {
    for (const entry of TOOL_CASES) {
      expect(entry.id).toMatch(
        /^(search|read|organization|duplicates|export|ambiguous)-\d{3}$/,
      );
      expect(entry.forbiddenTools).toBeDefined();
      expect(entry.forbiddenActions).toBeDefined();
      expect(entry.prompt).not.toMatch(
        /\/Users\/|@[a-z0-9.-]+\.[a-z]{2,}|api[_-]?key/i,
      );
      expect(entry.prompt.length).toBeLessThanOrEqual(220);
    }
  });

  test("keeps expected arguments valid in both benchmark and Pond schemas", () => {
    for (const entry of TOOL_CASES) {
      if (entry.expectation.kind === "clarification") {
        expect(entry.expectation.allowedTools).toEqual(["requestQuestion"]);
        continue;
      }
      for (const toolName of entry.expectation.allowedTools) {
        expect(
          BENCHMARK_TOOL_SCHEMAS[toolName].safeParse(
            entry.expectation.exampleArguments,
          ).success,
          `${entry.id} benchmark schema`,
        ).toBe(true);
        expect(
          canonicalSchemas[toolName].safeParse(
            entry.expectation.exampleArguments,
          ).success,
          `${entry.id} Pond schema`,
        ).toBe(true);
      }
    }
  });
});

describe("deterministic scoring", () => {
  test("invalid arguments fail even when the selected tool is correct", () => {
    const cases = [
      TOOL_CASES.find((entry) => entry.id === "search-001"),
      TOOL_CASES.find((entry) => entry.id === "read-001"),
      TOOL_CASES.find((entry) => entry.id === "organization-001"),
      TOOL_CASES.find((entry) => entry.id === "ambiguous-001"),
    ].filter((entry) => entry !== undefined);
    expect(cases).toHaveLength(4);

    const observations = [
      observed("search-001", {
        phase: "cold",
        latencyMs: 100,
        calls: [{ toolName: "searchLibrary", args: { query: "invoice" } }],
      }),
      observed("read-001", {
        latencyMs: 50,
        calls: [{ toolName: "readSave", args: { id: "", field: "unknown" } }],
      }),
      observed("organization-001", {
        latencyMs: 80,
        memoryBytes: 220,
        calls: [
          {
            toolName: "proposeChanges",
            args: {
              changes: [
                {
                  saveId: "demo-save-001",
                  field: "tags",
                  after: ["reference"],
                  reason: "Requested by the benchmark.",
                },
              ],
            },
          },
          { toolName: "openSave", args: { id: "demo-save-001" } },
        ],
      }),
      observed("ambiguous-001", {
        latencyMs: 70,
        calls: [
          {
            toolName: "requestQuestion",
            args: {
              question: "Which Saves should I organize?",
              options: ["Selected Saves", "Recent Saves"],
            },
          },
        ],
      }),
    ];

    const result = scoreBenchmark(cases, observations);
    expect(result.exactToolSelections).toBe(3);
    expect(result.schemaValidSelections).toBe(2);
    expect(result.exactValidToolCalls).toBe(2);
    expect(result.forbiddenAttemptCount).toBe(1);
    expect(result.clarificationRequired).toBe(1);
    expect(result.correctClarifications).toBe(1);
    expect(result.clarificationSuccessRate).toBe(1);
    expect(result.observedClarificationRate).toBe(0.25);
    expect(result.coldLoadMs).toBe(100);
    expect(result.warmLatencyP50Ms).toBe(70);
    expect(result.warmLatencyP95Ms).toBe(80);
    expect(result.peakMemoryBytes).toBe(220);
  });
});

describe("FunctionGemma adoption gate", () => {
  test("accepts a five-point exact-valid improvement with bounded safety and memory", () => {
    const result = decideFunctionGemmaAdoption({
      evidence: "live",
      requiredCaseIds: gateCaseIds,
      memoryBudgetBytes: 2_000,
      baseline: summary({ exactValidToolCallRate: 0.7 }),
      candidate: summary({
        modelId: "functiongemma",
        exactValidToolCallRate: 0.75,
        peakMemoryBytes: 1_500,
      }),
    });
    expect(result).toMatchObject({ evaluated: true, adopted: true });
  });

  test("accepts a thirty-percent warm p95 reduction", () => {
    const result = decideFunctionGemmaAdoption({
      evidence: "live",
      requiredCaseIds: gateCaseIds,
      memoryBudgetBytes: 2_000,
      baseline: summary({ warmLatencyP95Ms: 1_000 }),
      candidate: summary({
        modelId: "functiongemma",
        warmLatencyP95Ms: 700,
        peakMemoryBytes: 1_500,
      }),
    });
    expect(result).toMatchObject({ evaluated: true, adopted: true });
  });

  test("rejects increased forbidden attempts and an exceeded memory budget", () => {
    const result = decideFunctionGemmaAdoption({
      evidence: "live",
      requiredCaseIds: gateCaseIds,
      memoryBudgetBytes: 1_000,
      baseline: summary({ forbiddenAttemptCount: 0 }),
      candidate: summary({
        exactValidToolCallRate: 0.9,
        forbiddenAttemptCount: 1,
        peakMemoryBytes: 1_001,
      }),
    });
    expect(result.evaluated).toBe(true);
    expect(result.adopted).toBe(false);
    expect(result.reasons).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/forbidden/i),
        expect.stringMatching(/memory/i),
      ]),
    );
  });

  test("never adopts without complete live evidence", () => {
    expect(
      decideFunctionGemmaAdoption({
        evidence: "fixture",
        requiredCaseIds: gateCaseIds,
        memoryBudgetBytes: 2_000,
        baseline: summary(),
        candidate: summary({ exactValidToolCallRate: 1 }),
      }),
    ).toMatchObject({ evaluated: false, adopted: false });

    expect(
      decideFunctionGemmaAdoption({
        evidence: "live",
        requiredCaseIds: [...gateCaseIds, "missing-case"],
        memoryBudgetBytes: 2_000,
        baseline: summary(),
        candidate: summary({ exactValidToolCallRate: 1 }),
      }),
    ).toMatchObject({ evaluated: false, adopted: false });
  });
});

describe("CLI and JSONL boundary", () => {
  test("supports offline dry-run and requires explicit live model arguments", () => {
    expect(parseToolBenchmarkArguments(["--dry-run"])).toEqual({
      mode: "dry-run",
    });
    expect(() => parseToolBenchmarkArguments(["--live"])).toThrow(/--provider/);
    expect(
      parseToolBenchmarkArguments([
        "--live",
        "--provider",
        "ollama",
        "--base-url",
        "http://127.0.0.1:11434",
        "--baseline-model",
        "gemma4:e2b",
        "--candidate-model",
        "functiongemma:latest",
        "--memory-budget-mib",
        "8192",
        "--run-id",
        "functiongemma-20261008",
      ]),
    ).toMatchObject({
      mode: "live",
      provider: "ollama",
      baselineModel: "gemma4:e2b",
      candidateModel: "functiongemma:latest",
    });
  });

  test("keeps output below .tmp/benchmarks and writes content-minimized JSONL", async () => {
    const root = await mkdtemp(join(tmpdir(), "pond-tool-benchmark-"));
    const path = resolveBenchmarkOutputPath(root, "safe-run-01");
    expect(path).toBe(
      join(root, ".tmp", "benchmarks", "safe-run-01", "tools.jsonl"),
    );
    expect(() => resolveBenchmarkOutputPath(root, "../escape")).toThrow(
      /run ID/i,
    );

    const cases = [
      TOOL_CASES.find((entry) => entry.id === "export-001"),
    ].filter((entry) => entry !== undefined);
    const observations = [
      observed("export-001", {
        calls: [
          {
            toolName: "proposeChanges",
            args: {
              changes: [
                {
                  saveId: "",
                  field: "action",
                  action: "exportFiles",
                  after: "Export two Saves",
                  payload: {
                    ids: ["demo-save-001", "demo-save-002"],
                    directory: "/Users/example/Private Export",
                  },
                  reason: "Secret prompt content",
                },
              ],
            },
          },
        ],
      }),
    ];
    const scored = scoreBenchmark(cases, observations);
    await writeBenchmarkJsonl({
      repoRoot: root,
      runId: "safe-run-01",
      evidence: "fixture",
      observations,
      cases,
      summary: scored,
    });
    const text = await readFile(path, "utf8");
    expect(text).not.toContain("/Users/example");
    expect(text).not.toContain("Secret prompt content");
    expect(text).not.toContain('"args"');
    expect(text).not.toContain('"prompt"');
    expect(text.trim().split("\n").length).toBe(2);
  });

  test("writes both model summaries and repeated corpus case IDs", async () => {
    const root = await mkdtemp(join(tmpdir(), "pond-tool-benchmark-pair-"));
    const cases = [
      TOOL_CASES.find((entry) => entry.id === "search-001"),
    ].filter((entry) => entry !== undefined);
    const baselineObservations = [
      observed("search-001", {
        modelId: "gemma-baseline",
        calls: [{ toolName: "searchLibrary", args: { query: "invoice" } }],
      }),
    ];
    const candidateObservations = [
      observed("search-001", {
        modelId: "functiongemma-candidate",
        calls: [{ toolName: "searchLibrary", args: { query: "invoice" } }],
      }),
    ];
    await writeBenchmarkJsonl({
      repoRoot: root,
      runId: "paired-models",
      evidence: "fixture",
      cases,
      observations: [...baselineObservations, ...candidateObservations],
      summary: [
        scoreBenchmark(cases, baselineObservations),
        scoreBenchmark(cases, candidateObservations),
      ],
    });
    const text = await readFile(
      resolveBenchmarkOutputPath(root, "paired-models"),
      "utf8",
    );
    const lines = text
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));
    expect(lines).toHaveLength(4);
    expect(
      lines
        .filter((entry) => entry.kind === "summary")
        .map((entry) => entry.summary.modelId),
    ).toEqual(["gemma-baseline", "functiongemma-candidate"]);
    expect(
      lines
        .filter((entry) => entry.kind === "case")
        .map((entry) => entry.caseId),
    ).toEqual(["search-001", "search-001"]);
  });
});
