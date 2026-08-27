import type {
  Op,
  Prefs,
  Save,
  Source,
  SyncAction,
  TaskStatus,
} from "@pond/schema/db";
import type { Query } from "@pond/schema/filters/types";

/**
 * What survives the structured clone between main and the renderer: JSON, plus the `Date`s
 * drizzle hands back for timestamp columns that a handler returns unconverted.
 */
export type WireJson =
  | string
  | number
  | boolean
  | null
  | Date
  | readonly WireJson[]
  | { readonly [key: string]: WireJson | undefined };

/** A single model row on the wire. */
export interface WireRow {
  readonly [key: string]: WireJson | undefined;
}

/** One structured-clone object per query; the schema the handler registers decides what its fields mean. */
export type WireQueryParams = WireRow;

/**
 * The two queries whose params carry a domain object rather than loose JSON. Both are plain data,
 * but their types are declared with `interface` (RQB's `RuleGroupType`, the schema's `WindowBounds`),
 * and TypeScript never grants those an implicit index signature, so `WireRow` cannot describe them.
 */
export interface WireFilterQueryParams {
  query: Query;
  sortKey: string;
  sortDir: string;
}

/** `settings.setPrefs` merges one partially filled slice. */
export type WirePrefsPatch = { [K in keyof Prefs]?: Partial<Prefs[K]> };

export interface WireTask {
  op: Op;
  status: TaskStatus;
  attempts: number;
  maxAttempts: number;
  lastError: string | null;
  nextRunAt: number;
  updatedAt: number;
}

/** The list queries skip the heavy columns, so a wire row is a save minus those. */
export type WireSaveRow = Omit<
  Save,
  "embedding" | "clipEmbedding" | "transcript" | "rawSlim"
>;

/**
 * A save as it crosses the bridge. Timestamps are epoch ms rather than `Date`: the columns are
 * `timestamp_ms`, main converts them once in `toWireSave`, and the renderer keeps them as numbers.
 */
export type WireSave = Omit<
  WireSaveRow,
  | "savedAt"
  | "createdAt"
  | "deletedAt"
  | "publishedAt"
  | "ingestStartedAt"
  | "ingestCompletedAt"
> & {
  savedAt: number;
  createdAt: number;
  deletedAt: number | null;
  publishedAt: number | null;
  ingestStartedAt: number | null;
  ingestCompletedAt: number | null;
  tasks?: WireTask[];
};

/** `data`/`prevData` of a sync action: one model row, a list of them, or nothing. */
export type WireSyncPayload = WireRow | readonly WireRow[] | null;

/** A committed change broadcast to every window; timestamps inside `data` are epoch ms too. */
export type WireSyncAction = Omit<
  SyncAction,
  "createdAt" | "data" | "prevData"
> & {
  createdAt: number;
  data: WireSyncPayload;
  prevData: WireSyncPayload;
};

export type WireSyncState =
  | "idle"
  | "running"
  | "done"
  | "error"
  | "auth_required"
  | "paused";

export interface WireSyncStatusUpdate {
  accountId: string;
  source: Source;
  state: WireSyncState;
  message?: string;
  progress?: { current: number; total: number };
  lastSyncedAt?: string | null;
  lastError?: string | null;
}

export interface WireUndoState {
  ok: boolean;
  canUndo: boolean;
  canRedo: boolean;
}
