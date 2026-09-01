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

export interface ChatInput {
  system: string;
  messages: { role: "user" | "assistant"; content: string }[];
  context: string;
  responseSchema?: object;
}

export interface AiProvider {
  readonly id: string;
  compilePlan(input: string, ctx: CompileContext): Promise<RawQueryPlan | null>;
  available(): Promise<boolean>;
}
