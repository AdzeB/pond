import log from "electron-log/main.js";
import { getPrefs } from "../prefs";
import { HttpProvider } from "./http-provider";
import { LlamaCppProvider } from "./llamacpp-provider";
import type { AiProvider, CompileContext, SummaryItem } from "./types";

export type { CompileContext, CompileFacets, SummaryItem } from "./types";

// Picks the configured LLM provider from prefs. Embeddings live on-device in the
// renderer; this only resolves the LLM stage used by the NL query compiler.
let cached: { id: string; provider: AiProvider } | null = null;

export async function resolveProvider(): Promise<AiProvider> {
  const ai = (await getPrefs()).ai;
  const id = ai.provider;
  if (cached && cached.id === id) return cached.provider;

  const provider: AiProvider =
    id === "bundled"
      ? new LlamaCppProvider()
      : new HttpProvider({
          kind: id,
          endpoint: ai.endpoint,
          model: ai.modelId,
        });

  cached = { id, provider };
  return provider;
}

// Invalidate the cached provider after a settings change.
export function resetProvider(): void {
  cached = null;
}

// Compile NL -> raw Query JSON via the active provider. Returns null on failure
// so the renderer falls back to its deterministic stages.
export async function compileQuery(
  input: string,
  ctx: CompileContext,
): Promise<unknown> {
  try {
    const provider = await resolveProvider();
    return await provider.compileQuery(input, ctx);
  } catch (err) {
    log.warn("[ai] compileQuery failed", err);
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
    const provider = await resolveProvider();
    return await provider.summarize(question, items);
  } catch (err) {
    log.warn("[ai] summarize failed", err);
    return null;
  }
}

export async function providerAvailable(): Promise<boolean> {
  try {
    return await (await resolveProvider()).available();
  } catch {
    return false;
  }
}
