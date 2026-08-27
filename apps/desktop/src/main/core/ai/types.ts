import type { RawQueryPlan } from "@pond/schema/query-plan";
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
  /** The model's raw proposal; the renderer re-validates it with `validatePlan` before applying. */
  compilePlan(input: string, ctx: CompileContext): Promise<RawQueryPlan | null>;
  available(): Promise<boolean>;
}
