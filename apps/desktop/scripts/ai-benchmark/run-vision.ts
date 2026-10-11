import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import type { VisionManifestItem } from "./manifest";

export type VisionBenchmarkTask = "caption" | "ocr";
export type VisionBenchmarkPhase = "cold" | "warm";
export type VisionBenchmarkFailureCode =
  | "inference-failed"
  | "empty-output"
  | "output-too-long";

export const VISION_TASK_CONFIG = {
  caption: {
    prompt:
      "Describe the image in exactly one factual sentence. State only visible facts. Do not add a preamble and do not guess anyone's identity.",
    promptVersion: "pond-caption-v1",
    maxOutputCharacters: 500,
  },
  ocr: {
    prompt:
      "Transcribe only the visible text verbatim in reading order. Preserve line breaks. Return an empty response when no text is visible. Do not add a preamble or commentary.",
    promptVersion: "pond-ocr-v1",
    maxOutputCharacters: 16_000,
  },
} as const satisfies Record<
  VisionBenchmarkTask,
  {
    prompt: string;
    promptVersion: string;
    maxOutputCharacters: number;
  }
>;

export const VISION_BENCHMARK_POLICY = {
  deterministicRuns: 1,
  stochasticCandidateRuns: 3,
  stochasticBaseline: "unsupported",
} as const;

export interface CanonicalVisionImage {
  readonly width: number;
  readonly height: number;
  readonly pixelFormat: "rgba8";
  readonly pixelsBase64: string;
}

export type VisionSampling =
  | { readonly mode: "deterministic" }
  | { readonly mode: "stochastic"; readonly temperature: number };

export interface VisionImplementationMetadata {
  readonly implementation: "florence" | "gemma";
  readonly implementationRevision: string;
  readonly modelId: string;
  readonly modelRevision: string;
  readonly modelTag: string;
  readonly quantization: string;
  readonly role: "baseline" | "candidate";
  readonly sampling: VisionSampling;
}

export interface VisionBenchmarkInvocation {
  readonly image: Readonly<CanonicalVisionImage>;
  readonly task: VisionBenchmarkTask;
  readonly prompt: string;
  readonly promptVersion: string;
  readonly runIndex: number;
}

export interface VisionBenchmarkImplementation {
  readonly metadata: VisionImplementationMetadata;
  run(input: VisionBenchmarkInvocation): Promise<{ text: string }>;
}

export interface VisionBenchmarkDependencies {
  readSource(path: string): Promise<Uint8Array>;
  decodeImage(bytes: Uint8Array): Promise<CanonicalVisionImage>;
  now(): number;
  memoryBytes(): number;
}

export interface VisionBenchmarkRow {
  readonly corpusId: string;
  readonly corpusItemId: string;
  readonly sourceHash: string;
  readonly task: VisionBenchmarkTask;
  readonly implementation: VisionImplementationMetadata["implementation"];
  readonly implementationRevision: string;
  readonly modelId: string;
  readonly modelRevision: string;
  readonly modelTag: string;
  readonly quantization: string;
  readonly role: VisionImplementationMetadata["role"];
  readonly sampling: VisionSampling["mode"];
  readonly temperature: number | null;
  readonly runIndex: number;
  readonly promptVersion: string;
  readonly outputText: string | null;
  readonly durationMs: number;
  readonly phase: VisionBenchmarkPhase;
  readonly processMemoryBeforeBytes: number;
  readonly processMemoryAfterBytes: number;
  readonly failureCode: VisionBenchmarkFailureCode | null;
}

export interface VisionBenchmarkPaths {
  readonly directory: string;
  readonly results: string;
  readonly captionEvaluator: string;
  readonly captionKey: string;
}

export interface VisionBenchmarkResult {
  readonly paths: VisionBenchmarkPaths;
  readonly rows: readonly VisionBenchmarkRow[];
}

type VisionOutput = Pick<VisionBenchmarkRow, "outputText" | "failureCode">;

interface BlindCaptionFiles {
  evaluator: string;
  key: string;
}

const RUN_ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,79}$/;
const CORPUS_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/;
const MAX_METADATA_CHARACTERS = 200;
const MAX_DURATION_MS = 10 * 60_000;

function boundedNumber(value: number, maximum: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(maximum, Math.max(0, Math.round(value)));
}

function validateIdentifier(
  value: string,
  pattern: RegExp,
  description: string,
): void {
  if (!pattern.test(value))
    throw new Error(`${description} contains unsupported characters.`);
}

function validatePinnedMetadata(metadata: VisionImplementationMetadata): void {
  const pinnedValues = [
    metadata.implementationRevision,
    metadata.modelId,
    metadata.modelRevision,
    metadata.modelTag,
    metadata.quantization,
  ];
  if (
    pinnedValues.some(
      (value) =>
        value.trim().length === 0 || value.length > MAX_METADATA_CHARACTERS,
    )
  )
    throw new Error(
      "Vision benchmark model metadata must be pinned and bounded.",
    );
  if (
    metadata.sampling.mode === "stochastic" &&
    (!Number.isFinite(metadata.sampling.temperature) ||
      metadata.sampling.temperature <= 0)
  )
    throw new Error("Stochastic sampling requires a positive temperature.");
  if (metadata.role === "baseline" && metadata.sampling.mode === "stochastic")
    throw new Error(
      "A stochastic baseline is unsupported by benchmark policy.",
    );
}

function validateImplementations(
  implementations: readonly VisionBenchmarkImplementation[],
): void {
  if (implementations.length !== 2)
    throw new Error(
      "Vision benchmarks require one Florence and one Gemma implementation.",
    );
  const identities = new Set<string>();
  const roles = new Set<string>();
  for (const implementation of implementations) {
    validatePinnedMetadata(implementation.metadata);
    identities.add(implementation.metadata.implementation);
    roles.add(implementation.metadata.role);
    if (
      (implementation.metadata.implementation === "florence" &&
        implementation.metadata.role !== "baseline") ||
      (implementation.metadata.implementation === "gemma" &&
        implementation.metadata.role !== "candidate")
    )
      throw new Error(
        "Florence must be the baseline and Gemma must be the candidate.",
      );
  }
  if (
    identities.size !== 2 ||
    !identities.has("florence") ||
    !identities.has("gemma") ||
    roles.size !== 2 ||
    !roles.has("baseline") ||
    !roles.has("candidate")
  )
    throw new Error(
      "Vision benchmarks require distinct Florence baseline and Gemma candidate implementations.",
    );
}

function runCount(metadata: VisionImplementationMetadata): number {
  return metadata.sampling.mode === "stochastic"
    ? VISION_BENCHMARK_POLICY.stochasticCandidateRuns
    : VISION_BENCHMARK_POLICY.deterministicRuns;
}

function tasksFor(item: VisionManifestItem): VisionBenchmarkTask[] {
  const tasks: VisionBenchmarkTask[] = [];
  if (item.mustMention !== undefined) tasks.push("caption");
  if (item.ocrReference !== undefined) tasks.push("ocr");
  return tasks;
}

function canonicalImage(image: CanonicalVisionImage): CanonicalVisionImage {
  const expectedBytes = image.width * image.height * 4;
  if (
    !Number.isInteger(image.width) ||
    image.width <= 0 ||
    !Number.isInteger(image.height) ||
    image.height <= 0 ||
    image.pixelFormat !== "rgba8" ||
    image.pixelsBase64.length === 0 ||
    !Number.isSafeInteger(expectedBytes) ||
    Buffer.from(image.pixelsBase64, "base64").byteLength !== expectedBytes
  )
    throw new Error("The image decoder returned an invalid canonical image.");
  return Object.freeze({
    width: image.width,
    height: image.height,
    pixelFormat: image.pixelFormat,
    pixelsBase64: image.pixelsBase64,
  });
}

function outputResult(
  task: VisionBenchmarkTask,
  result: { text: string },
): VisionOutput {
  const outputText = result.text.replace(/\r\n?/g, "\n").trim();
  if (task === "caption" && outputText.length === 0)
    return { outputText: null, failureCode: "empty-output" };
  if (outputText.length > VISION_TASK_CONFIG[task].maxOutputCharacters)
    return { outputText: null, failureCode: "output-too-long" };
  return { outputText, failureCode: null };
}

function stableOrderKey(value: string): number {
  let hash = 2166136261;
  for (const character of value)
    hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  return hash >>> 0;
}

function anonymousLabel(index: number): string {
  let value = index;
  let label = "";
  do {
    label = String.fromCharCode(65 + (value % 26)) + label;
    value = Math.floor(value / 26) - 1;
  } while (value >= 0);
  return label;
}

interface BlindOutput {
  label: string;
  text: string;
}

interface BlindIdentity {
  kind: "identity";
  corpusId: string;
  corpusItemId: string;
  label: string;
  implementation: VisionImplementationMetadata["implementation"];
  implementationRevision: string;
  modelId: string;
  modelRevision: string;
  modelTag: string;
  quantization: string;
  runIndex: number;
}

function blindCaptionLines(input: {
  corpusId: string;
  seed: string;
  items: readonly VisionManifestItem[];
  rows: readonly VisionBenchmarkRow[];
}): BlindCaptionFiles {
  const evaluatorLines: unknown[] = [
    { kind: "metadata", corpusId: input.corpusId, seed: input.seed },
  ];
  const keyLines: unknown[] = [
    { kind: "metadata", corpusId: input.corpusId, seed: input.seed },
  ];
  for (const item of input.items) {
    if (item.mustMention === undefined) continue;
    const outputs = input.rows
      .filter(
        (row) =>
          row.corpusItemId === item.id &&
          row.task === "caption" &&
          row.outputText !== null &&
          row.failureCode === null,
      )
      .map((row) => ({ row }))
      .sort((left, right) => {
        const leftIdentity = `${input.seed}\0${item.id}\0${left.row.implementation}\0${left.row.runIndex}`;
        const rightIdentity = `${input.seed}\0${item.id}\0${right.row.implementation}\0${right.row.runIndex}`;
        return (
          stableOrderKey(leftIdentity) - stableOrderKey(rightIdentity) ||
          leftIdentity.localeCompare(rightIdentity)
        );
      });
    const evaluatorOutputs: BlindOutput[] = [];
    const identities: BlindIdentity[] = [];
    for (const [index, output] of outputs.entries()) {
      const label = anonymousLabel(index);
      evaluatorOutputs.push({ label, text: output.row.outputText ?? "" });
      identities.push({
        kind: "identity",
        corpusId: input.corpusId,
        corpusItemId: item.id,
        label,
        implementation: output.row.implementation,
        implementationRevision: output.row.implementationRevision,
        modelId: output.row.modelId,
        modelRevision: output.row.modelRevision,
        modelTag: output.row.modelTag,
        quantization: output.row.quantization,
        runIndex: output.row.runIndex,
      });
    }
    evaluatorLines.push({
      kind: "caption",
      corpusId: input.corpusId,
      corpusItemId: item.id,
      outputs: evaluatorOutputs,
      mustMention: item.mustMention,
      forbiddenClaims: item.forbiddenClaims ?? [],
    });
    keyLines.push(...identities);
  }
  return {
    evaluator: `${evaluatorLines.map((line) => JSON.stringify(line)).join("\n")}\n`,
    key: `${keyLines.map((line) => JSON.stringify(line)).join("\n")}\n`,
  };
}

export function resolveVisionBenchmarkPaths(
  repoRoot: string,
  runId: string,
): VisionBenchmarkPaths {
  validateIdentifier(runId, RUN_ID_PATTERN, "Run ID");
  const directory = join(resolve(repoRoot), ".tmp", "benchmarks", runId);
  return {
    directory,
    results: join(directory, "vision-results.jsonl"),
    captionEvaluator: join(directory, "caption-evaluator.jsonl"),
    captionKey: join(directory, "caption-key.jsonl"),
  };
}

export async function runVisionBenchmark(input: {
  repoRoot: string;
  runId: string;
  corpusId: string;
  items: readonly VisionManifestItem[];
  blindSeed: string;
  implementations: readonly VisionBenchmarkImplementation[];
  dependencies: VisionBenchmarkDependencies;
}): Promise<VisionBenchmarkResult> {
  validateIdentifier(input.corpusId, CORPUS_ID_PATTERN, "Corpus ID");
  if (input.blindSeed.trim().length === 0 || input.blindSeed.length > 200)
    throw new Error("Blind-caption seed must be non-empty and bounded.");
  validateImplementations(input.implementations);
  const paths = resolveVisionBenchmarkPaths(input.repoRoot, input.runId);
  await mkdir(join(resolve(input.repoRoot), ".tmp", "benchmarks"), {
    recursive: true,
  });
  await mkdir(paths.directory);

  const rows: VisionBenchmarkRow[] = [];
  const warmed = new Set<VisionImplementationMetadata["implementation"]>();
  for (const item of input.items) {
    const sourceBytes = await input.dependencies.readSource(item.path);
    const sourceHash = createHash("sha256").update(sourceBytes).digest("hex");
    const image = canonicalImage(
      await input.dependencies.decodeImage(sourceBytes),
    );
    for (const task of tasksFor(item)) {
      const taskConfig = VISION_TASK_CONFIG[task];
      for (const implementation of input.implementations) {
        const { metadata } = implementation;
        for (let runIndex = 1; runIndex <= runCount(metadata); runIndex += 1) {
          const phase = warmed.has(metadata.implementation) ? "warm" : "cold";
          warmed.add(metadata.implementation);
          const processMemoryBeforeBytes = boundedNumber(
            input.dependencies.memoryBytes(),
            Number.MAX_SAFE_INTEGER,
          );
          const startedAt = input.dependencies.now();
          let output: VisionOutput;
          try {
            output = outputResult(
              task,
              await implementation.run({
                image,
                task,
                prompt: taskConfig.prompt,
                promptVersion: taskConfig.promptVersion,
                runIndex,
              }),
            );
          } catch {
            output = {
              outputText: null,
              failureCode: "inference-failed",
            };
          }
          const durationMs = boundedNumber(
            input.dependencies.now() - startedAt,
            MAX_DURATION_MS,
          );
          const processMemoryAfterBytes = boundedNumber(
            input.dependencies.memoryBytes(),
            Number.MAX_SAFE_INTEGER,
          );
          rows.push({
            corpusId: input.corpusId,
            corpusItemId: item.id,
            sourceHash,
            task,
            implementation: metadata.implementation,
            implementationRevision: metadata.implementationRevision,
            modelId: metadata.modelId,
            modelRevision: metadata.modelRevision,
            modelTag: metadata.modelTag,
            quantization: metadata.quantization,
            role: metadata.role,
            sampling: metadata.sampling.mode,
            temperature:
              metadata.sampling.mode === "stochastic"
                ? metadata.sampling.temperature
                : null,
            runIndex,
            promptVersion: taskConfig.promptVersion,
            ...output,
            durationMs,
            phase,
            processMemoryBeforeBytes,
            processMemoryAfterBytes,
          });
        }
      }
    }
  }

  const blind = blindCaptionLines({
    corpusId: input.corpusId,
    seed: input.blindSeed,
    items: input.items,
    rows,
  });
  await writeFile(
    paths.results,
    `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`,
    { encoding: "utf8", flag: "wx" },
  );
  await writeFile(paths.captionEvaluator, blind.evaluator, {
    encoding: "utf8",
    flag: "wx",
  });
  await writeFile(paths.captionKey, blind.key, {
    encoding: "utf8",
    flag: "wx",
  });
  return { paths, rows };
}
