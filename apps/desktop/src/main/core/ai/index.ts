import type { AgentStepRecord } from "@pond/schema";
import log from "electron-log/main.js";
import { LlamaCppProvider } from "./llamacpp-provider";
import type { CompileContext, SummaryItem } from "./types";

export type { CompileFacets, SummaryItem } from "./types";

/** LLM stage of the "find anything" compiler. Always the bundled on-device model. */

let bundled: LlamaCppProvider | null = null;

function getBundled(): LlamaCppProvider {
  bundled ??= new LlamaCppProvider();
  return bundled;
}

/** Invalidates the cached bundled session after a settings change. */
export function resetProvider(): void {
  bundled = null;
}

/** Returns null on failure so the renderer falls back to its deterministic one-step plan. */
export async function compilePlan(
  input: string,
  ctx: CompileContext,
): Promise<unknown> {
  try {
    return await getBundled().compilePlan(input, ctx);
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
    return await getBundled().agentStep(question, ctx, steps);
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
    return await getBundled().summarize(question, items);
  } catch (err) {
    log.warn("[ai] summarize failed", err);
    return null;
  }
}
