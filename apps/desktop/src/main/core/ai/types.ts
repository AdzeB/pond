export interface CompileFacets {
  sources: string[];
  types: string[];
  tags: string[];
  creators: string[];
}

export interface CompileContext {
  facets: CompileFacets;
}
