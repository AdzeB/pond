import type { AgentStepRecord } from "@pond/schema";
import {
  agentStep,
  type CompileFacets,
  compilePlan,
  providerAvailable,
  resetProvider,
  type SummaryItem,
  summarize,
} from "../../core/ai";
import { getAiApiKey, setAiApiKey } from "../../keychain";
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
  // Natural language -> raw QueryPlan JSON (untrusted; validated + clamped by
  // the renderer's validatePlan). The single LLM compile entry point: networked
  // providers emit a full plan; the bundled model returns a filter-only plan.
  async "ai.compilePlan"(params) {
    const input = String(params.input ?? "").slice(0, 500);
    if (!input.trim()) return { plan: null };
    const facets = asFacets(params.facets);
    const plan = await compilePlan(input, { facets });
    return { plan };
  },

  // One round of the agentic loop -> a raw AgentAction JSON object (untrusted;
  // parsed/validated by the renderer). The renderer runs the action's tool over
  // the pool and sends the accumulated steps back for the next round.
  async "ai.agentStep"(params) {
    const question = String(params.question ?? "").slice(0, 500);
    if (!question.trim()) return { action: null };
    const facets = asFacets(params.facets);
    const steps = Array.isArray(params.steps)
      ? (params.steps as AgentStepRecord[])
      : [];
    const action = await agentStep(question, { facets }, steps);
    return { action };
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

  // Persist (or clear) a provider's API key in the OS keychain.
  async "ai.setApiKey"(params) {
    const provider = String(params.provider ?? "").trim();
    if (!provider) return { ok: false };
    const key = params.key != null ? String(params.key) : null;
    await setAiApiKey(provider, key);
    resetProvider();
    return { ok: true };
  },

  // Whether a key is stored for the given provider (so the UI can show state
  // without ever exposing the key itself).
  async "ai.hasApiKey"(params) {
    const provider = String(params.provider ?? "").trim();
    if (!provider) return { present: false };
    const key = await getAiApiKey(provider);
    return { present: Boolean(key) };
  },
};
