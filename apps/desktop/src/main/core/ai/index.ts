import {
  type AgentStepRecord,
  agentActionSchema,
  queryPlanSchema,
} from "@pond/schema";
import { generateText, type LanguageModel, Output } from "ai";
import log from "electron-log/main.js";
import { jsonrepair } from "jsonrepair";
import type { z } from "zod";
import { getPrefs } from "../prefs";
import { LlamaCppProvider } from "./llamacpp-provider";
import {
  buildAgentPrompt,
  buildPlanPrompt,
  buildSummaryPrompt,
  formatAgentHistory,
  formatSummaryItems,
} from "./schema-prompt";
import { resolveModel } from "./sdk-registry";
import type { CompileContext, SummaryItem } from "./types";

export type { CompileFacets, SummaryItem } from "./types";

// The LLM stage of the "find anything" compiler. Networked providers run through
// the Vercel AI SDK (structured output via generateText + Output.object, prose
// via generateText); the on-device bundled model keeps its own node-llama-cpp path.
// Embeddings are unrelated and always run on-device in the renderer.

// The bundled provider holds an expensive native session, so it's cached;
// networked models are cheap config objects resolved fresh each call (keys and
// endpoints can change between calls).
let bundled: LlamaCppProvider | null = null;

function getBundled(): LlamaCppProvider {
  bundled ??= new LlamaCppProvider();
  return bundled;
}

async function isBundled(): Promise<boolean> {
  return (await getPrefs()).ai.provider === "bundled";
}

// Invalidate the cached bundled session after a settings change.
export function resetProvider(): void {
  bundled = null;
}

// Best-effort JSON recovery for providers where structured output isn't available
// or the model wraps its output in prose/markdown despite instructions.
function parseLenient(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    // fall through
  }
  try {
    return JSON.parse(jsonrepair(trimmed));
  } catch {
    // fall through
  }
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) {
    const slice = trimmed.slice(start, end + 1);
    try {
      return JSON.parse(slice);
    } catch {
      // fall through
    }
    try {
      return JSON.parse(jsonrepair(slice));
    } catch {
      return null;
    }
  }
  return null;
}

// Ask the model for a JSON object: try the SDK's structured-output path first
// (fast-fail with one retry), then fall back to free-text + jsonrepair so even
// providers that reject the JSON schema (e.g. Gemini's restricted shapes) work.
// The result is untrusted and re-validated by the renderer regardless.
async function generateJson(
  model: LanguageModel,
  schema: z.ZodType,
  system: string,
  prompt: string,
): Promise<unknown> {
  try {
    const { output } = await generateText({
      model,
      output: Output.object({ schema }),
      system,
      prompt,
      temperature: 0,
      maxRetries: 1,
    });
    return output;
  } catch (err) {
    log.warn("[ai] structured output failed; falling back to text", err);
  }
  const { text } = await generateText({
    model,
    system,
    prompt,
    temperature: 0,
  });
  return parseLenient(text);
}

// Compile NL -> raw QueryPlan JSON via the active provider. Returns null on
// failure so the renderer falls back to its deterministic one-step plan.
export async function compilePlan(
  input: string,
  ctx: CompileContext,
): Promise<unknown> {
  try {
    if (await isBundled()) return await getBundled().compilePlan(input, ctx);
    const resolved = await resolveModel();
    if (!resolved) return null;
    return await generateJson(
      resolved.model,
      queryPlanSchema,
      buildPlanPrompt(ctx),
      input,
    );
  } catch (err) {
    log.warn("[ai] compilePlan failed", err);
    return null;
  }
}

// One round of the agentic loop via the active provider. Returns null on failure
// so the renderer can end the loop and fall back to a single-shot plan.
export async function agentStep(
  question: string,
  ctx: CompileContext,
  steps: ReadonlyArray<AgentStepRecord>,
): Promise<unknown> {
  try {
    if (await isBundled()) {
      return await getBundled().agentStep(question, ctx, steps);
    }
    const resolved = await resolveModel();
    if (!resolved) return null;
    return await generateJson(
      resolved.model,
      agentActionSchema,
      buildAgentPrompt(ctx),
      formatAgentHistory(question, steps),
    );
  } catch (err) {
    log.warn("[ai] agentStep failed", err);
    return null;
  }
}

// Summarize a result set via the active provider. Returns null on failure so
// the renderer simply omits the summary and falls back to the count/question.
export async function summarize(
  question: string,
  items: SummaryItem[],
): Promise<string | null> {
  try {
    if (items.length === 0) return "";
    if (await isBundled()) return await getBundled().summarize(question, items);
    const resolved = await resolveModel();
    if (!resolved) return null;
    const { text } = await generateText({
      model: resolved.model,
      system: buildSummaryPrompt(),
      prompt: formatSummaryItems(question, items),
      temperature: 0.3,
      maxOutputTokens: 200,
    });
    return text.trim();
  } catch (err) {
    log.warn("[ai] summarize failed", err);
    return null;
  }
}

export async function providerAvailable(): Promise<boolean> {
  try {
    if (await isBundled()) return await getBundled().available();
    const resolved = await resolveModel();
    if (!resolved) return false;
    await generateText({
      model: resolved.model,
      prompt: "ping",
      maxOutputTokens: 1,
      maxRetries: 0,
      abortSignal: AbortSignal.timeout(8000),
    });
    return true;
  } catch {
    return false;
  }
}
