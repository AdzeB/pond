import type { AgentStepRecord } from "@pond/schema";

// Shared types for the local AI provider layer that powers the "find anything"
// natural-language query compiler. Embeddings run on-device in the renderer;
// this layer only covers the LLM stage (NL -> structured Query JSON).

export interface CompileFacets {
  // Distinct values present in the user's library, used to ground the model so
  // it picks real values. Capped by the caller to keep the prompt bounded.
  sources: string[];
  types: string[];
  tags: string[];
  creators: string[];
}

export interface CompileContext {
  facets: CompileFacets;
}

// A compact descriptor of a matched save, fed to the summarizer. Kept small so
// the prompt stays bounded; the model only needs enough to spot themes.
export interface SummaryItem {
  title: string;
  author?: string;
  source?: string;
  tags?: string[];
}

export interface AiProvider {
  readonly id: string;
  // Compile natural language into a raw Query-shaped JSON object. The result is
  // untrusted and re-validated (Stage D) before it is ever applied.
  compileQuery(input: string, ctx: CompileContext): Promise<unknown>;
  // Compile natural language into a raw QueryPlan-shaped JSON object (filter plus
  // optional rank/group/limit/aggregate). Untrusted; re-validated (validatePlan)
  // before execution. Non-capable providers may return a filter-only plan.
  compilePlan(input: string, ctx: CompileContext): Promise<unknown>;
  // One round of the agentic loop: given the request and the steps taken so far,
  // return a raw AgentAction JSON object. Untrusted; parsed/validated by the
  // renderer. Non-capable providers return a one-shot "final" plan.
  agentStep(
    question: string,
    ctx: CompileContext,
    steps: ReadonlyArray<AgentStepRecord>,
  ): Promise<unknown>;
  // Write a short prose summary of a result set for the user's question.
  // Returns plain text; best-effort, so callers tolerate an empty string.
  summarize(question: string, items: SummaryItem[]): Promise<string>;
  // Whether the provider is reachable/usable right now.
  available(): Promise<boolean>;
}
