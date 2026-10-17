import { LIST_KINDS } from "@pond/schema/list-kinds";
import { sourceLabel } from "@pond/schema/sources";
import { z } from "zod";
import {
  type ImportScopeProblem,
  importScopeOptions,
  normalizeImportScope,
} from "../../../shared/import-scope";
import type { OkFailure } from "../../../shared/query-contracts-shared";
import {
  isAccountConnected,
  listSourceCollections,
} from "../../core/refresh/harvest-window";
import { isSyncing } from "../../core/sync";
import { resolveAccountHandle } from "../../core/sync/account-key";
import {
  getAccount,
  listAccounts,
  partitionForAccount,
  patchAccount,
  patchAccountSync,
  removeAccount,
} from "../../core/sync/accounts";
import { fillMissingAvatars } from "../../core/sync/avatars";
import { importScopePatch } from "../../core/sync/import-scope";
import { countSavesForAccount } from "../../core/sync/sync-baseline";
import {
  type QueryHandlerMap,
  query,
  StringParam,
  TrimmedTextParam,
} from "./params";

const ACCOUNT_NOT_FOUND: OkFailure = { ok: false, error: "Account not found." };
const SYNC_LIKES_UNSUPPORTED: OkFailure = {
  ok: false,
  error: "Syncing Likes is only available for X accounts.",
};

interface SetSyncLikesDependencies {
  getAccount: typeof getAccount;
  patchAccountSync: typeof patchAccountSync;
}

export function createSetSyncLikesQuery(
  dependencies: SetSyncLikesDependencies = { getAccount, patchAccountSync },
) {
  return query(
    z.strictObject({
      accountId: z.string().trim().min(1),
      syncLikes: z.boolean(),
    }),
    async (params) => {
      const account = await dependencies.getAccount(params.accountId);
      if (!account) return ACCOUNT_NOT_FOUND;
      if (account.source !== "twitter") return SYNC_LIKES_UNSUPPORTED;
      await dependencies.patchAccountSync(params.accountId, {
        syncLikes: params.syncLikes,
      });
      return { ok: true as const };
    },
  );
}

const IMPORT_SCOPE_PROBLEMS = {
  no_lists: "Choose at least one list to import.",
  no_collections: "Choose at least one board to import.",
} satisfies Record<ImportScopeProblem, string>;

const ImportScopeParam = z.strictObject({
  listKinds: z.array(z.enum(LIST_KINDS)).max(LIST_KINDS.length).optional(),
  collections: z
    .array(
      z.strictObject({
        id: z.string().trim().min(1).max(64),
        name: z.string().trim().max(200),
      }),
    )
    .max(500)
    .optional(),
});

interface SetImportScopeDependencies {
  getAccount: typeof getAccount;
  patchAccountSync: typeof patchAccountSync;
}

export function createSetImportScopeQuery(
  dependencies: SetImportScopeDependencies = { getAccount, patchAccountSync },
) {
  return query(
    z.strictObject({
      accountId: z.string().trim().min(1),
      scope: ImportScopeParam,
    }),
    async (params) => {
      const account = await dependencies.getAccount(params.accountId);
      if (!account) return ACCOUNT_NOT_FOUND;
      const normalized = normalizeImportScope(account.source, params.scope);
      if (!normalized.ok) {
        return {
          ok: false as const,
          error: IMPORT_SCOPE_PROBLEMS[normalized.problem],
        };
      }
      await dependencies.patchAccountSync(
        params.accountId,
        importScopePatch(account.sync, normalized.scope),
      );
      return { ok: true as const };
    },
  );
}

interface ImportOptionsDependencies {
  getAccount: typeof getAccount;
  resolveAccountHandle: typeof resolveAccountHandle;
  listSourceCollections: typeof listSourceCollections;
}

export function createImportOptionsQuery(
  dependencies: ImportOptionsDependencies = {
    getAccount,
    resolveAccountHandle,
    listSourceCollections,
  },
) {
  return query(
    z.strictObject({ accountId: z.string().trim().min(1) }),
    async (params) => {
      const account = await dependencies.getAccount(params.accountId);
      if (!account) return ACCOUNT_NOT_FOUND;
      if (!importScopeOptions(account.source).collections) {
        return { ok: true as const, collections: null };
      }
      const label = sourceLabel(account.source);
      const handle = await dependencies.resolveAccountHandle(account);
      if (!handle) {
        return {
          ok: false as const,
          error: `Pond couldn't find your ${label} username. Reconnect the Account and try again.`,
        };
      }
      const result = await dependencies.listSourceCollections(account.source, {
        partition: partitionForAccount(account.id),
        accountKey: handle,
      });
      if (!result.ok) {
        return {
          ok: false as const,
          error:
            result.reason === "auth_required"
              ? `${label} signed you out. Reconnect the Account to load your boards.`
              : result.reason === "rate_limited"
                ? `${label} asked Pond to slow down. Try again in a few minutes.`
                : "Pond couldn't load your boards. Try again.",
        };
      }
      return { ok: true as const, collections: result.collections };
    },
  );
}

export const accountsQueries = {
  async "accounts.list"() {
    fillMissingAvatars();
    const accounts = await listAccounts();
    const rows = await Promise.all(
      accounts.map(async (account) => {
        const knownCount = await countSavesForAccount(account).catch(
          () => account.sync.knownCount,
        );
        return {
          ...account,
          sync: { ...account.sync, knownCount },
          connected: await isAccountConnected(account).catch(() => false),
          syncing: isSyncing(account.id),
        };
      }),
    );
    return { accounts: rows };
  },

  "accounts.setHandle": query(
    z.object({ accountId: StringParam, handle: TrimmedTextParam }),
    async (params) => {
      const account = await patchAccount(params.accountId, {
        handle: params.handle,
        avatarUrl: null,
        avatarCheckedAt: null,
      });
      if (!account) return ACCOUNT_NOT_FOUND;
      fillMissingAvatars();
      return { ok: true as const, account };
    },
  ),

  "accounts.setLabel": query(
    z.object({ accountId: StringParam, label: TrimmedTextParam }),
    async (params) => {
      const account = await patchAccount(params.accountId, {
        label: params.label,
      });
      return account ? { ok: true as const, account } : ACCOUNT_NOT_FOUND;
    },
  ),

  "accounts.setSyncLikes": createSetSyncLikesQuery(),

  "accounts.importOptions": createImportOptionsQuery(),

  "accounts.setImportScope": createSetImportScopeQuery(),

  "accounts.disconnect": query(
    z.object({ accountId: StringParam }),
    async (params) => {
      const account = await getAccount(params.accountId);
      if (!account) return ACCOUNT_NOT_FOUND;
      await removeAccount(params.accountId);
      return { ok: true as const };
    },
  ),
} satisfies QueryHandlerMap;
