import {
  type CompileFacets,
  compileQuery,
  providerAvailable,
  resetProvider,
  type SummaryItem,
  summarize,
} from "../../core/ai";
import { setAiApiKey } from "../../keychain";
import type { QueryHandlerMap } from "../helpers";

// IPC surface for the local AI query compiler. The renderer owns the
// deterministic + embedding stages and the Stage D validation gate; the main
// process only runs the LLM stage (which may need native/network access).

function asStringArray(value: unknown, cap: number): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string").slice(0, cap);
}

function asFacets(raw: unknown): CompileFacets {
  const obj = (raw ?? {}) as Record<string, unknown>;
  return {
    sources: asStringArray(obj.sources, 50),
    types: asStringArray(obj.types, 20),
    tags: asStringArray(obj.tags, 120),
    creators: asStringArray(obj.creators, 80),
  };
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

// Parse + bound the summary payload: at most 12 items, each trimmed to the few
// fields the model needs. Anything malformed is dropped.
function asSummaryItems(raw: unknown): SummaryItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .slice(0, 12)
    .map((entry): SummaryItem | null => {
      const obj = (entry ?? {}) as Record<string, unknown>;
      const title = asString(obj.title) ?? "Untitled";
      return {
        title: title.slice(0, 200),
        author: asString(obj.author)?.slice(0, 120),
        source: asString(obj.source)?.slice(0, 60),
        tags: asStringArray(obj.tags, 6),
      };
    })
    .filter((it): it is SummaryItem => it !== null);
}

export const aiQueries: QueryHandlerMap = {
  // Natural language -> raw Query JSON (untrusted; validated by the renderer).
  async "ai.compileQuery"(params) {
    const input = String(params.input ?? "").slice(0, 500);
    if (!input.trim()) return { query: null };
    const facets = asFacets(params.facets);
    const query = await compileQuery(input, { facets });
    return { query };
  },

  // Result set + question -> a short prose summary (best-effort; "" on failure).
  async "ai.summarize"(params) {
    const question = String(params.question ?? "").slice(0, 500);
    const items = asSummaryItems(params.items);
    if (items.length === 0) return { summary: "" };
    const summary = await summarize(question, items);
    return { summary: summary ?? "" };
  },

  // Whether the configured provider is reachable/usable right now.
  async "ai.providerStatus"() {
    return { available: await providerAvailable() };
  },

  // Persist (or clear) the custom-endpoint API key in the OS keychain.
  async "ai.setApiKey"(params) {
    const key = params.key != null ? String(params.key) : null;
    await setAiApiKey(key);
    resetProvider();
    return { ok: true };
  },
};
