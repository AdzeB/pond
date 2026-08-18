import type { AgentStepRecord } from "@pond/schema";
import {
  agentStep,
  type CompileFacets,
  compilePlan,
  type SummaryItem,
  summarize,
} from "../../core/ai";
import type { QueryHandlerMap } from "../helpers";

/** IPC surface for the local AI query compiler; the renderer owns the deterministic/embedding stages and validation, main only runs the LLM stage. */

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

/** Bounds the summary payload to 12 items trimmed to the few fields the model needs; malformed entries are dropped. */
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
  /** Natural language to raw QueryPlan JSON, untrusted and validated by the renderer; the bundled model emits a filter-only plan. */
  async "ai.compilePlan"(params) {
    const input = String(params.input ?? "").slice(0, 500);
    if (!input.trim()) return { plan: null };
    const facets = asFacets(params.facets);
    const plan = await compilePlan(input, { facets });
    return { plan };
  },

  /** One round of the agentic loop; the renderer validates the action, runs its tool, and sends the accumulated steps back for the next round. */
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

  /** Result set + question to a short prose summary; best-effort, "" on failure. */
  async "ai.summarize"(params) {
    const question = String(params.question ?? "").slice(0, 500);
    const items = asSummaryItems(params.items);
    if (items.length === 0) return { summary: "" };
    const summary = await summarize(question, items);
    return { summary: summary ?? "" };
  },
};
