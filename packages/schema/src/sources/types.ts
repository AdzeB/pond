/** Ordered feeds (cursor/scroll) can early-stop on known ids; `full` walks everything; `none` has no list sync. */
export type SyncStrategy = "cursor" | "scroll" | "full" | "none";

/** Pacing the rate governor enforces; every field defaults from DEFAULT_RATE_PROFILE, so a descriptor only overrides what it must. */
export interface RateProfile {
  /** Minimum spacing between requests to this source (ms). */
  readonly minDelayMs: number;
  /** Random jitter added to each delay, as a fraction of minDelayMs (0..1). */
  readonly jitterFraction: number;
  /** Hard ceiling on requests per rolling window. */
  readonly maxPerWindow: number;
  /** Rolling window length the ceiling applies over (ms). */
  readonly windowMs: number;
  /** Delay multiplier applied during the first/full sync (the riskiest run). */
  readonly firstSyncSlowdown: number;
}

/** Declared once on the descriptor; resolved through `syncConfigFor`, which fills every field from conservative defaults. */
export interface SourceSyncConfig {
  readonly strategy: SyncStrategy;
  readonly rate: RateProfile;
}

/** A descriptor may override any subset; the rest comes from defaults. */
export type SourceSyncOverride = {
  readonly strategy?: SyncStrategy;
  readonly rate?: Partial<RateProfile>;
};

/** Cross-runtime description of a source; main-process-only logic lives on `Extractor`. */
export interface SourceDescriptor {
  /** Stable identifier. Also the `Source` value persisted in the database. */
  readonly id: string;
  /** Human-facing name, e.g. "Are.na". */
  readonly label: string;
  /** Apex hostnames this source owns (matched exactly or as a subdomain). */
  readonly hosts: readonly string[];
  /** Patterns that identify an individual saveable item URL for this source. */
  readonly urlPatterns: readonly RegExp[];
  /**
   * Sync/pacing overrides; omitted entirely for a non-list-synced source.
   * Resolve with `syncConfigFor` rather than reading this directly.
   */
  readonly sync?: SourceSyncOverride;
}
