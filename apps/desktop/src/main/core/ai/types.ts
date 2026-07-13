import type { AgentStepRecord } from "@pond/schema";

/** Types for the AI provider layer; embeddings run on-device in the renderer, this layer covers only the LLM stage. */

export interface CompileFacets {
  /** Distinct library values grounding the model; capped by the caller to keep the prompt bounded. */
  sources: string[];
  types: string[];
  tags: string[];
  creators: string[];
}

export interface CompileContext {
  facets: CompileFacets;
}

/** Descriptor of a matched save fed to the summarizer; kept small so the prompt stays bounded. */
export interface SummaryItem {
  title: string;
  author?: string;
  source?: string;
  tags?: string[];
}

export interface AiProvider {
  readonly id: string;
  /** Result is untrusted and re-validated (Stage D) before it is ever applied. */
  compileQuery(input: string, ctx: CompileContext): Promise<unknown>;
  /** Result is untrusted and re-validated (validatePlan) before execution; non-capable providers may return a filter-only plan. */
  compilePlan(input: string, ctx: CompileContext): Promise<unknown>;
  /** Result is untrusted and validated by the renderer; non-capable providers return a one-shot "final" plan. */
  agentStep(
    question: string,
    ctx: CompileContext,
    steps: ReadonlyArray<AgentStepRecord>,
  ): Promise<unknown>;
  /** Best-effort; callers tolerate an empty string. */
  summarize(question: string, items: SummaryItem[]): Promise<string>;
  available(): Promise<boolean>;
}
