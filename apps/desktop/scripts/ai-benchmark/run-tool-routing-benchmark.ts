import { generateText, tool } from "ai";
import { z } from "zod";
import { createLocalLanguageModel } from "../../src/main/core/agent/local-language-model";
import {
  BENCHMARK_TOOL_SCHEMAS,
  TOOL_CASES,
  type ToolRoutingCase,
} from "./tool-cases";
import {
  type BenchmarkObservation,
  decideFunctionGemmaAdoption,
  type LocalBenchmarkProvider,
  type ObservedToolCall,
  parseToolBenchmarkArguments,
  scoreBenchmark,
  writeBenchmarkJsonl,
} from "./tool-routing-benchmark";

const TOOL_DESCRIPTIONS = {
  searchLibrary:
    "Search the Pond Library. This is read-only and requires a concrete query or filter.",
  readSave:
    "Read a known Save by its exact ID, optionally selecting one content field.",
  findDuplicates:
    "Find duplicate Saves for review. This does not merge or delete anything.",
  proposeChanges:
    "Prepare changes for explicit user review. This never applies the changes.",
  requestQuestion:
    "Ask one necessary clarifying question with two to four distinct options.",
} as const;

const SYSTEM = `Route exactly one Pond request to exactly one supplied tool.
Use requestQuestion when a required Save, folder, destination, or choice is missing.
proposeChanges only prepares a review; it never applies a change.
Never invent IDs, paths, or choices. Never call a tool that is not supplied.`;

const OllamaPsResponse = z.object({
  models: z.array(
    z.object({
      name: z.string().optional(),
      model: z.string().optional(),
      size: z.number().nonnegative().optional(),
    }),
  ),
});

const ObservedCalls = z.array(
  z.object({ toolName: z.string(), input: z.json() }),
);

function benchmarkTools() {
  return {
    searchLibrary: tool({
      description: TOOL_DESCRIPTIONS.searchLibrary,
      inputSchema: BENCHMARK_TOOL_SCHEMAS.searchLibrary,
    }),
    readSave: tool({
      description: TOOL_DESCRIPTIONS.readSave,
      inputSchema: BENCHMARK_TOOL_SCHEMAS.readSave,
    }),
    findDuplicates: tool({
      description: TOOL_DESCRIPTIONS.findDuplicates,
      inputSchema: BENCHMARK_TOOL_SCHEMAS.findDuplicates,
    }),
    proposeChanges: tool({
      description: TOOL_DESCRIPTIONS.proposeChanges,
      inputSchema: BENCHMARK_TOOL_SCHEMAS.proposeChanges,
    }),
    requestQuestion: tool({
      description: TOOL_DESCRIPTIONS.requestQuestion,
      inputSchema: BENCHMARK_TOOL_SCHEMAS.requestQuestion,
    }),
  };
}

function usage(): string {
  return `Pond local tool-routing benchmark

Offline structure check:
  node apps/desktop/scripts/ai-benchmark/run-tool-routing-benchmark.mjs --dry-run

Explicit live comparison:
  node apps/desktop/scripts/ai-benchmark/run-tool-routing-benchmark.mjs --live \\
    --provider <ollama|lmstudio> --base-url <url> \\
    --baseline-model <gemma-model-id> --candidate-model <functiongemma-model-id> \\
    --memory-budget-mib <MiB> --run-id <lowercase-run-id>

Optional live flags:
  --timeout-ms <milliseconds>
  --baseline-memory-mib <MiB>    Runtime memory measured externally
  --candidate-memory-mib <MiB>   Runtime memory measured externally

The command never downloads models. Install and unload both models yourself before
the run if you need the first request to represent a true cold load. Ollama memory
is read from /api/ps; LM Studio needs the explicit memory flags for an adoption decision.`;
}

function validateCorpus(): void {
  const ids = new Set<string>();
  for (const benchmarkCase of TOOL_CASES) {
    if (ids.has(benchmarkCase.id))
      throw new Error(`Duplicate corpus ID ${benchmarkCase.id}.`);
    ids.add(benchmarkCase.id);
    if (benchmarkCase.expectation.kind === "clarification") continue;
    for (const toolName of benchmarkCase.expectation.allowedTools)
      BENCHMARK_TOOL_SCHEMAS[toolName].parse(
        benchmarkCase.expectation.exampleArguments,
      );
  }
  if (TOOL_CASES.length < 100)
    throw new Error("The tool corpus must contain at least 100 cases.");
}

function ollamaOrigin(baseUrl: string): string {
  return baseUrl.replace(/\/v1\/?$/i, "").replace(/\/$/, "");
}

async function runtimeMemoryBytes(input: {
  provider: LocalBenchmarkProvider;
  baseUrl: string;
  modelId: string;
  supplied: number | null;
}): Promise<number | null> {
  if (input.supplied !== null) return input.supplied;
  if (input.provider !== "ollama") return null;
  try {
    const response = await fetch(`${ollamaOrigin(input.baseUrl)}/api/ps`, {
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) return null;
    const parsed = OllamaPsResponse.safeParse(await response.json());
    if (!parsed.success) return null;
    const loaded = parsed.data.models.find(
      (entry) => entry.name === input.modelId || entry.model === input.modelId,
    );
    return loaded?.size ?? null;
  } catch {
    return null;
  }
}

function observedCalls(serializedCalls: string): ObservedToolCall[] {
  return ObservedCalls.parse(JSON.parse(serializedCalls)).map((call) => ({
    toolName: call.toolName,
    args: call.input,
  }));
}

async function observeCase(input: {
  provider: LocalBenchmarkProvider;
  baseUrl: string;
  modelId: string;
  memoryBytes: number | null;
  timeoutMs: number;
  benchmarkCase: ToolRoutingCase;
  phase: "cold" | "warm";
}): Promise<BenchmarkObservation> {
  const startedAt = performance.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), input.timeoutMs);
  try {
    const model = await createLocalLanguageModel({
      provider: input.provider,
      model: input.modelId,
      baseUrl: input.baseUrl,
    });
    const result = await generateText({
      model,
      system: SYSTEM,
      prompt: input.benchmarkCase.prompt,
      tools: benchmarkTools(),
      toolChoice: "required",
      maxOutputTokens: 256,
      abortSignal: controller.signal,
    });
    return {
      caseId: input.benchmarkCase.id,
      modelId: input.modelId,
      provider: input.provider,
      phase: input.phase,
      latencyMs: performance.now() - startedAt,
      memoryBytes: await runtimeMemoryBytes({
        provider: input.provider,
        baseUrl: input.baseUrl,
        modelId: input.modelId,
        supplied: input.memoryBytes,
      }),
      calls: observedCalls(JSON.stringify(result.toolCalls)),
      outcome: "ok",
    };
  } catch {
    return {
      caseId: input.benchmarkCase.id,
      modelId: input.modelId,
      provider: input.provider,
      phase: input.phase,
      latencyMs: performance.now() - startedAt,
      memoryBytes: await runtimeMemoryBytes({
        provider: input.provider,
        baseUrl: input.baseUrl,
        modelId: input.modelId,
        supplied: input.memoryBytes,
      }),
      calls: [],
      outcome: "error",
      errorCode: controller.signal.aborted ? "timeout" : "model-error",
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function benchmarkModel(input: {
  provider: LocalBenchmarkProvider;
  baseUrl: string;
  modelId: string;
  memoryBytes: number | null;
  timeoutMs: number;
}): Promise<BenchmarkObservation[]> {
  const observations: BenchmarkObservation[] = [];
  for (const [index, benchmarkCase] of TOOL_CASES.entries()) {
    const observation = await observeCase({
      ...input,
      benchmarkCase,
      phase: index === 0 ? "cold" : "warm",
    });
    observations.push(observation);
    process.stdout.write(
      `${input.modelId} ${index + 1}/${TOOL_CASES.length} ${benchmarkCase.id} ${observation.outcome}\n`,
    );
  }
  return observations;
}

export async function runToolRoutingBenchmark(
  argv: readonly string[],
  repoRoot: string,
): Promise<void> {
  const args = parseToolBenchmarkArguments(argv);
  if (args.mode === "help") {
    process.stdout.write(`${usage()}\n`);
    return;
  }
  validateCorpus();
  if (args.mode === "dry-run") {
    process.stdout.write(
      `Validated ${TOOL_CASES.length} synthetic Pond cases and five review-safe tool schemas. No model was called and no benchmark result was written.\n`,
    );
    return;
  }

  const baselineObservations = await benchmarkModel({
    provider: args.provider,
    baseUrl: args.baseUrl,
    modelId: args.baselineModel,
    memoryBytes: args.baselineMemoryBytes,
    timeoutMs: args.timeoutMs,
  });
  const candidateObservations = await benchmarkModel({
    provider: args.provider,
    baseUrl: args.baseUrl,
    modelId: args.candidateModel,
    memoryBytes: args.candidateMemoryBytes,
    timeoutMs: args.timeoutMs,
  });
  const baseline = scoreBenchmark(TOOL_CASES, baselineObservations);
  const candidate = scoreBenchmark(TOOL_CASES, candidateObservations);
  const decision = decideFunctionGemmaAdoption({
    evidence: "live",
    requiredCaseIds: TOOL_CASES.map((entry) => entry.id),
    memoryBudgetBytes: args.memoryBudgetBytes,
    baseline,
    candidate,
  });
  const outputPath = await writeBenchmarkJsonl({
    repoRoot,
    runId: args.runId,
    evidence: "live",
    cases: TOOL_CASES,
    observations: [...baselineObservations, ...candidateObservations],
    summary: [baseline, candidate],
    decision,
  });
  process.stdout.write(
    `${decision.adopted ? "ADOPT" : "DO NOT ADOPT"}: ${decision.reasons.join(" ") || "The predeclared gate passed."}\nResults: ${outputPath}\n`,
  );
}
