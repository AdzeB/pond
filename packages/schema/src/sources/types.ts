// The cross-runtime description of a source. This is deliberately tiny: it
// holds only the data that every runtime (node main, browser renderer, the
// extension, and this schema package) needs. Anything that is main-process
// only (extraction logic, auth cookies, handle parsing) lives on the
// `Extractor` class in the desktop app instead, co-located with the code that
// uses it.
export interface SourceDescriptor {
  /** Stable identifier. Also the `Source` value persisted in the database. */
  readonly id: string;
  /** Human-facing name, e.g. "Are.na". */
  readonly label: string;
  /**
   * Apex hostnames this source owns. A URL belongs to the source when its
   * hostname equals one of these or ends with `"." + host` (subdomains).
   */
  readonly hosts: readonly string[];
  /** Patterns that identify an individual saveable item URL for this source. */
  readonly urlPatterns: readonly RegExp[];
}
