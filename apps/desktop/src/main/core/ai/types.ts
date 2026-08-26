export interface CompileFacets {
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
