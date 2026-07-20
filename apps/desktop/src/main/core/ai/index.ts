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

/** LLM stage of the "find anything" compiler: networked providers via the AI SDK, the bundled model via its own node-llama-cpp path. */

/** The bundled provider holds an expensive native session, so it's cached; networked models are resolved fresh so key/endpoint changes apply. */
let bundled: LlamaCppProvider | null = null;

function getBundled(): LlamaCppProvider {
  bundled ??= new LlamaCppProvider();
  return bundled;
}

async function isBundled(): Promise<boolean> {
  return (await getPrefs()).ai.provider === "bundled";
}

/** Invalidates the cached bundled session after a settings change. */
export function resetProvider(): void {
  bundled = null;
}

/** Best-effort JSON recovery for models that wrap output in prose/markdown despite instructions. */
function parseLenient(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {}
  try {
    return JSON.parse(jsonrepair(trimmed));
  } catch {}
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) {
    const slice = trimmed.slice(start, end + 1);
    try {
      return JSON.parse(slice);
    } catch {}
    try {
      return JSON.parse(jsonrepair(slice));
    } catch {
      return null;
    }
  }
  return null;
}

/** Tries the SDK structured-output path, then free text + jsonrepair for providers that reject the JSON schema (e.g. Gemini's restricted shapes); the renderer re-validates the result regardless. */
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

/** Returns null on failure so the renderer falls back to its deterministic one-step plan. */
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

/** Returns null on failure so the renderer ends the loop and falls back to a single-shot plan. */
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

/** Returns null on failure so the renderer omits the summary and falls back to the count/question. */
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
      /** OpenAI's Responses API rejects max_output_tokens below 16 with a 400. */
      maxOutputTokens: 16,
      maxRetries: 0,
      abortSignal: AbortSignal.timeout(8000),
    });
    return true;
  } catch (err) {
    log.warn("[ai] provider ping failed", err);
    return false;
  }
}
