import type { ConnectedAccount, ImportScope } from "@pond/schema/db";
import type { ImportCollectionOption } from "./import-scope";
import type { EmptyInput, OkResult } from "./query-contracts-shared";

/** An Account or a Watch: both fetch on a schedule and own the saves they bring in. */
export interface SourceTargetInput {
  kind: "account" | "watch";
  id: string;
}

export interface AccountQueryInputs {
  "accounts.list": EmptyInput;
  "accounts.setHandle": { accountId: string; handle: string | null };
  "accounts.setLabel": { accountId: string; label: string | null };
  "accounts.importOptions": { accountId: string };
  "accounts.setImportScope": { accountId: string; scope: ImportScope };
  "accounts.disconnect": { accountId: string };
  "sources.setSchedule": SourceTargetInput & {
    paused: boolean;
    /** Null follows the global schedule. */
    intervalHours: number | null;
  };
  "sources.setIncoming": SourceTargetInput & {
    folderId: string | null;
    tags: string[];
  };
  "sources.overview": { id: string };
}

export interface SourceOverview {
  saves: number;
  bytes: number;
  /** Newest first. */
  recent: string[];
}

export interface AccountQueryResults {
  "accounts.list": {
    accounts: (ConnectedAccount & { connected: boolean; syncing: boolean })[];
  };
  "accounts.setHandle": OkResult<{ account: ConnectedAccount }>;
  "accounts.setLabel": OkResult<{ account: ConnectedAccount }>;
  /** `collections` is null when the Source can only import everything on that list. */
  "accounts.importOptions": OkResult<{
    collections: ImportCollectionOption[] | null;
  }>;
  "accounts.setImportScope": OkResult;
  "accounts.disconnect": OkResult;
  "sources.setSchedule": OkResult;
  "sources.setIncoming": OkResult;
  "sources.overview": SourceOverview;
}
