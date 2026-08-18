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

export interface AiProvider {
  readonly id: string;
  /** Result is untrusted and re-validated (validatePlan) before the renderer applies it. */
  compilePlan(input: string, ctx: CompileContext): Promise<unknown>;
  available(): Promise<boolean>;
}
