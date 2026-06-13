// Cross-runtime description of a source; main-process-only logic lives on `Extractor`.
export interface SourceDescriptor {
  /** Stable identifier. Also the `Source` value persisted in the database. */
  readonly id: string;
  /** Human-facing name, e.g. "Are.na". */
  readonly label: string;
  /** Apex hostnames this source owns (matched exactly or as a subdomain). */
  readonly hosts: readonly string[];
  /** Patterns that identify an individual saveable item URL for this source. */
  readonly urlPatterns: readonly RegExp[];
}
