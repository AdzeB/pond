import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import type { JsonObject, JsonValue } from "@pond/schema/json";
import { z } from "zod";
import {
  BENCHMARK_TOOL_SCHEMAS,
  type BenchmarkToolName,
  type ToolRoutingCase,
} from "./tool-cases";

export type LocalBenchmarkProvider = "ollama" | "lmstudio";
export type BenchmarkEvidence = "live" | "fixture";

export interface ObservedToolCall {
  toolName: string;
  args: JsonValue;
}

export interface BenchmarkObservation {
  caseId: string;
  modelId: string;
  provider: LocalBenchmarkProvider;
  phase: "cold" | "warm";
  latencyMs: number;
  memoryBytes: number | null;
  calls: ObservedToolCall[];
  outcome: "ok" | "error";
  errorCode?: string;
}

interface CaseScore {
  caseId: string;
  exactToolSelection: boolean;
  schemaValidSelection: boolean;
  argumentsMatch: boolean;
  exactValidToolCall: boolean;
  forbiddenAttempts: number;
  correctClarification: boolean;
  observedClarification: boolean;
}

export interface BenchmarkSummary {
  modelId: string;
  provider: LocalBenchmarkProvider;
  caseIds: string[];
  totalCases: number;
  observedCases: number;
  exactToolSelections: number;
  schemaValidSelections: number;
  exactValidToolCalls: number;
  exactValidToolCallRate: number;
  forbiddenAttemptCount: number;
  forbiddenAttemptRate: number;
  clarificationRequired: number;
  correctClarifications: number;
  clarificationSuccessRate: number | null;
  observedClarificationRate: number;
  coldLoadMs: number | null;
  warmLatencyP50Ms: number | null;
  warmLatencyP95Ms: number | null;
  peakMemoryBytes: number | null;
}

export type ToolBenchmarkArguments =
  | { mode: "help" }
  | { mode: "dry-run" }
  | {
      mode: "live";
      provider: LocalBenchmarkProvider;
      baseUrl: string;
      baselineModel: string;
      candidateModel: string;
      memoryBudgetBytes: number;
      runId: string;
      timeoutMs: number;
      baselineMemoryBytes: number | null;
      candidateMemoryBytes: number | null;
    };

function asJsonObject(value: JsonValue): JsonObject | null {
  const parsed = z.record(z.string(), z.json()).safeParse(value);
  return parsed.success ? parsed.data : null;
}

function isSubset(expected: JsonValue, actual: JsonValue): boolean {
  if (Array.isArray(expected)) {
    return (
      Array.isArray(actual) &&
      expected.length === actual.length &&
      expected.every((value, index) => {
        const candidate = actual[index];
        return candidate !== undefined && isSubset(value, candidate);
      })
    );
  }
  const expectedObject = asJsonObject(expected);
  if (expectedObject) {
    const actualObject = asJsonObject(actual);
    if (!actualObject) return false;
    return Object.entries(expectedObject).every(([key, value]) => {
      const candidate = actualObject[key];
      return candidate !== undefined && isSubset(value, candidate);
    });
  }
  return Object.is(expected, actual);
}

function isBenchmarkToolName(name: string): name is BenchmarkToolName {
  return Object.hasOwn(BENCHMARK_TOOL_SCHEMAS, name);
}

function forbiddenActionAttempts(
  value: JsonValue,
  forbiddenActions: readonly string[],
): number {
  if (Array.isArray(value))
    return value.reduce<number>(
      (total, entry) =>
        total + forbiddenActionAttempts(entry, forbiddenActions),
      0,
    );
  const valueObject = asJsonObject(value);
  if (!valueObject) return 0;
  const action = z.string().safeParse(valueObject.action);
  const own = action.success && forbiddenActions.includes(action.data) ? 1 : 0;
  return (
    own +
    Object.values(valueObject).reduce<number>(
      (total, entry) =>
        total + forbiddenActionAttempts(entry, forbiddenActions),
      0,
    )
  );
}

function scoreCase(
  benchmarkCase: ToolRoutingCase,
  observation: BenchmarkObservation | undefined,
): CaseScore {
  const calls = observation?.calls ?? [];
  const call = calls[0];
  const exactToolSelection =
    observation?.outcome === "ok" &&
    calls.length === 1 &&
    call !== undefined &&
    benchmarkCase.expectation.allowedTools.some(
      (toolName) => toolName === call.toolName,
    );
  const schema =
    call && isBenchmarkToolName(call.toolName)
      ? BENCHMARK_TOOL_SCHEMAS[call.toolName]
      : undefined;
  const parsed = schema?.safeParse(call?.args);
  const schemaValidSelection = exactToolSelection && parsed?.success === true;
  const argumentsMatch =
    schemaValidSelection &&
    parsed?.success === true &&
    (benchmarkCase.expectation.kind === "clarification" ||
      isSubset(
        benchmarkCase.expectation.requiredArguments,
        z.json().parse(parsed.data),
      ));
  const forbiddenToolAttempts = calls.filter((entry) =>
    benchmarkCase.forbiddenTools.includes(entry.toolName),
  ).length;
  const forbiddenActions = calls.reduce(
    (total, entry) =>
      total +
      forbiddenActionAttempts(entry.args, benchmarkCase.forbiddenActions),
    0,
  );
  const observedClarification = calls.some(
    (entry) => entry.toolName === "requestQuestion",
  );
  const correctClarification =
    benchmarkCase.expectation.kind === "clarification" &&
    schemaValidSelection &&
    argumentsMatch;
  return {
    caseId: benchmarkCase.id,
    exactToolSelection,
    schemaValidSelection,
    argumentsMatch,
    exactValidToolCall: schemaValidSelection && argumentsMatch,
    forbiddenAttempts: forbiddenToolAttempts + forbiddenActions,
    correctClarification,
    observedClarification,
  };
}

function percentile(values: number[], percentileValue: number): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.max(
    0,
    Math.min(sorted.length - 1, Math.ceil(percentileValue * sorted.length) - 1),
  );
  return sorted[index] ?? null;
}

export function scoreBenchmark(
  cases: readonly ToolRoutingCase[],
  observations: readonly BenchmarkObservation[],
): BenchmarkSummary {
  const observationsByCase = new Map<string, BenchmarkObservation>();
  for (const observation of observations) {
    if (observationsByCase.has(observation.caseId))
      throw new Error(`Duplicate observation for ${observation.caseId}.`);
    observationsByCase.set(observation.caseId, observation);
  }
  const knownIds = new Set(cases.map((entry) => entry.id));
  for (const observation of observations) {
    if (!knownIds.has(observation.caseId))
      throw new Error(`Unknown benchmark case ${observation.caseId}.`);
  }
  const first = observations[0];
  for (const observation of observations) {
    if (
      first &&
      (observation.modelId !== first.modelId ||
        observation.provider !== first.provider)
    )
      throw new Error("Score one provider and model per benchmark summary.");
    if (!Number.isFinite(observation.latencyMs) || observation.latencyMs < 0)
      throw new Error(`Invalid latency for ${observation.caseId}.`);
    if (
      observation.memoryBytes !== null &&
      (!Number.isFinite(observation.memoryBytes) || observation.memoryBytes < 0)
    )
      throw new Error(`Invalid memory measurement for ${observation.caseId}.`);
  }

  const rows = cases.map((entry) =>
    scoreCase(entry, observationsByCase.get(entry.id)),
  );
  const totalCases = cases.length;
  const forbiddenAttemptCount = rows.reduce(
    (total, row) => total + row.forbiddenAttempts,
    0,
  );
  const clarificationRequired = cases.filter(
    (entry) => entry.expectation.kind === "clarification",
  ).length;
  const correctClarifications = rows.filter(
    (row) => row.correctClarification,
  ).length;
  const warmLatencies = observations
    .filter((entry) => entry.phase === "warm")
    .map((entry) => entry.latencyMs);
  const memories = observations.flatMap((entry) =>
    entry.memoryBytes === null ? [] : [entry.memoryBytes],
  );
  const exactValidToolCalls = rows.filter(
    (row) => row.exactValidToolCall,
  ).length;
  return {
    modelId: first?.modelId ?? "unmeasured",
    provider: first?.provider ?? "ollama",
    caseIds: observations.map((entry) => entry.caseId),
    totalCases,
    observedCases: observations.length,
    exactToolSelections: rows.filter((row) => row.exactToolSelection).length,
    schemaValidSelections: rows.filter((row) => row.schemaValidSelection)
      .length,
    exactValidToolCalls,
    exactValidToolCallRate:
      totalCases === 0 ? 0 : exactValidToolCalls / totalCases,
    forbiddenAttemptCount,
    forbiddenAttemptRate:
      totalCases === 0 ? 0 : forbiddenAttemptCount / totalCases,
    clarificationRequired,
    correctClarifications,
    clarificationSuccessRate:
      clarificationRequired === 0
        ? null
        : correctClarifications / clarificationRequired,
    observedClarificationRate:
      totalCases === 0
        ? 0
        : rows.filter((row) => row.observedClarification).length / totalCases,
    coldLoadMs:
      observations.find((entry) => entry.phase === "cold")?.latencyMs ?? null,
    warmLatencyP50Ms: percentile(warmLatencies, 0.5),
    warmLatencyP95Ms: percentile(warmLatencies, 0.95),
    peakMemoryBytes: memories.length ? Math.max(...memories) : null,
  };
}

export interface AdoptionDecision {
  evaluated: boolean;
  adopted: boolean;
  reasons: string[];
  exactValidImprovementPoints: number | null;
  warmP95Reduction: number | null;
}

function completeEvidence(
  summary: BenchmarkSummary | null,
  requiredCaseIds: readonly string[],
): boolean {
  if (!summary || summary.observedCases !== requiredCaseIds.length)
    return false;
  const observed = new Set(summary.caseIds);
  return (
    observed.size === requiredCaseIds.length &&
    requiredCaseIds.every((id) => observed.has(id))
  );
}

export function decideFunctionGemmaAdoption(input: {
  evidence: BenchmarkEvidence;
  requiredCaseIds: readonly string[];
  memoryBudgetBytes: number;
  baseline: BenchmarkSummary | null;
  candidate: BenchmarkSummary | null;
}): AdoptionDecision {
  const uniqueRequiredCaseIds = new Set(input.requiredCaseIds);
  const missingLiveEvidence =
    input.evidence !== "live" ||
    input.requiredCaseIds.length < 100 ||
    uniqueRequiredCaseIds.size !== input.requiredCaseIds.length ||
    !completeEvidence(input.baseline, input.requiredCaseIds) ||
    !completeEvidence(input.candidate, input.requiredCaseIds);
  if (missingLiveEvidence) {
    return {
      evaluated: false,
      adopted: false,
      reasons: [
        "Complete live observations for both models are required before adoption.",
      ],
      exactValidImprovementPoints: null,
      warmP95Reduction: null,
    };
  }
  const baseline = input.baseline;
  const candidate = input.candidate;
  if (!baseline || !candidate)
    throw new Error(
      "Complete summaries are required after evidence validation.",
    );
  const exactValidImprovementPoints =
    candidate.exactValidToolCallRate - baseline.exactValidToolCallRate;
  const warmP95Reduction =
    baseline.warmLatencyP95Ms !== null &&
    baseline.warmLatencyP95Ms > 0 &&
    candidate.warmLatencyP95Ms !== null
      ? (baseline.warmLatencyP95Ms - candidate.warmLatencyP95Ms) /
        baseline.warmLatencyP95Ms
      : null;
  const performancePass =
    exactValidImprovementPoints >= 0.05 - Number.EPSILON ||
    (warmP95Reduction !== null && warmP95Reduction >= 0.3 - Number.EPSILON);
  const forbiddenPass =
    candidate.forbiddenAttemptCount <= baseline.forbiddenAttemptCount;
  const memoryPass =
    candidate.peakMemoryBytes !== null &&
    candidate.peakMemoryBytes <= input.memoryBudgetBytes;
  const reasons: string[] = [];
  if (!performancePass)
    reasons.push(
      "FunctionGemma did not improve exact valid calls by 5 points or reduce warm p95 latency by 30%.",
    );
  if (!forbiddenPass)
    reasons.push("FunctionGemma increased forbidden-action attempts.");
  if (!memoryPass)
    reasons.push("FunctionGemma did not stay within the memory budget.");
  return {
    evaluated: true,
    adopted: performancePass && forbiddenPass && memoryPass,
    reasons,
    exactValidImprovementPoints,
    warmP95Reduction,
  };
}

function parsePositiveNumber(value: string | undefined, flag: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0)
    throw new Error(`${flag} must be a positive number.`);
  return parsed;
}

function optionalMib(value: string | undefined, flag: string): number | null {
  return value === undefined
    ? null
    : parsePositiveNumber(value, flag) * 1024 * 1024;
}

export function parseToolBenchmarkArguments(
  argv: readonly string[],
): ToolBenchmarkArguments {
  if (argv.length === 0 || argv.includes("--help") || argv.includes("-h"))
    return { mode: "help" };
  if (argv.length === 1 && argv[0] === "--dry-run") return { mode: "dry-run" };
  if (!argv.includes("--live")) throw new Error("Choose --dry-run or --live.");
  const values = new Map<string, string>();
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    if (flag === "--live") continue;
    if (!flag?.startsWith("--"))
      throw new Error(`Unexpected argument ${flag ?? ""}.`);
    const value = argv[index + 1];
    if (!value || value.startsWith("--"))
      throw new Error(`${flag} requires a value.`);
    values.set(flag, value);
    index += 1;
  }
  const provider = values.get("--provider");
  if (provider !== "ollama" && provider !== "lmstudio")
    throw new Error("--provider must be ollama or lmstudio.");
  const required = [
    "--base-url",
    "--baseline-model",
    "--candidate-model",
    "--memory-budget-mib",
    "--run-id",
  ];
  for (const flag of required) {
    if (!values.get(flag)) throw new Error(`${flag} is required for --live.`);
  }
  const known = new Set([
    ...required,
    "--provider",
    "--timeout-ms",
    "--baseline-memory-mib",
    "--candidate-memory-mib",
  ]);
  for (const flag of values.keys()) {
    if (!known.has(flag)) throw new Error(`Unknown option ${flag}.`);
  }
  const baseUrl = values.get("--base-url");
  const baselineModel = values.get("--baseline-model");
  const candidateModel = values.get("--candidate-model");
  const runId = values.get("--run-id");
  if (!baseUrl || !baselineModel || !candidateModel || !runId)
    throw new Error("Required live arguments were not resolved.");
  resolveBenchmarkOutputPath(process.cwd(), runId);
  return {
    mode: "live",
    provider,
    baseUrl,
    baselineModel,
    candidateModel,
    memoryBudgetBytes:
      parsePositiveNumber(
        values.get("--memory-budget-mib"),
        "--memory-budget-mib",
      ) *
      1024 *
      1024,
    runId,
    timeoutMs: values.has("--timeout-ms")
      ? parsePositiveNumber(values.get("--timeout-ms"), "--timeout-ms")
      : 120_000,
    baselineMemoryBytes: optionalMib(
      values.get("--baseline-memory-mib"),
      "--baseline-memory-mib",
    ),
    candidateMemoryBytes: optionalMib(
      values.get("--candidate-memory-mib"),
      "--candidate-memory-mib",
    ),
  };
}

export function resolveBenchmarkOutputPath(
  repoRoot: string,
  runId: string,
): string {
  if (!/^[a-z0-9][a-z0-9-]{0,79}$/.test(runId))
    throw new Error(
      "Run ID must contain only lowercase letters, numbers, and hyphens.",
    );
  return join(resolve(repoRoot), ".tmp", "benchmarks", runId, "tools.jsonl");
}

export async function writeBenchmarkJsonl(input: {
  repoRoot: string;
  runId: string;
  evidence: BenchmarkEvidence;
  cases: readonly ToolRoutingCase[];
  observations: readonly BenchmarkObservation[];
  summary: BenchmarkSummary | readonly BenchmarkSummary[];
  decision?: AdoptionDecision;
}): Promise<string> {
  const path = resolveBenchmarkOutputPath(input.repoRoot, input.runId);
  const casesById = new Map(input.cases.map((entry) => [entry.id, entry]));
  const summaries = Array.isArray(input.summary)
    ? input.summary
    : [input.summary];
  const lines: JsonValue[] = summaries.map((summary) => ({
    kind: "summary",
    runId: input.runId,
    evidence: input.evidence,
    summary: z.json().parse(summary),
  }));
  for (const observation of input.observations) {
    const benchmarkCase = casesById.get(observation.caseId);
    if (!benchmarkCase) continue;
    const scored = scoreCase(benchmarkCase, observation);
    lines.push({
      kind: "case",
      caseId: benchmarkCase.id,
      category: benchmarkCase.category,
      modelId: observation.modelId,
      provider: observation.provider,
      phase: observation.phase,
      latencyMs: observation.latencyMs,
      memoryBytes: observation.memoryBytes,
      outcome: observation.outcome,
      errorCode: observation.errorCode ?? null,
      calledTools: observation.calls.map((entry) => entry.toolName),
      exactToolSelection: scored.exactToolSelection,
      schemaValidSelection: scored.schemaValidSelection,
      argumentsMatch: scored.argumentsMatch,
      exactValidToolCall: scored.exactValidToolCall,
      forbiddenAttempts: scored.forbiddenAttempts,
      correctClarification: scored.correctClarification,
    });
  }
  if (input.decision) {
    lines.push({
      kind: "decision",
      runId: input.runId,
      decision: z.json().parse(input.decision),
    });
  }
  await mkdir(dirname(path), { recursive: true });
  await writeFile(
    path,
    `${lines.map((line) => JSON.stringify(line)).join("\n")}\n`,
    {
      encoding: "utf8",
      flag: "wx",
    },
  );
  return path;
}
