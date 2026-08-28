export type SyncStrategy = "cursor" | "scroll" | "full" | "none";

export interface RateProfile {
  readonly minDelayMs: number;
  readonly jitterFraction: number;
  readonly maxPerWindow: number;
  readonly windowMs: number;
  readonly firstSyncSlowdown: number;
  /** Ceilings a burst cannot spend its way past: a big backfill spreads over hours instead of hammering one host. */
  readonly maxPerHour: number;
  readonly maxPerDay: number;
}

export interface SourceSyncConfig {
  readonly strategy: SyncStrategy;
  readonly rate: RateProfile;
}

export type SourceSyncOverride = {
  readonly strategy?: SyncStrategy;
  readonly rate?: Partial<RateProfile>;
};

export interface SourceDescriptor {
  readonly id: string;
  readonly label: string;
  readonly hosts: readonly string[];
  readonly urlPatterns: readonly RegExp[];
  readonly sync?: SourceSyncOverride;
}
