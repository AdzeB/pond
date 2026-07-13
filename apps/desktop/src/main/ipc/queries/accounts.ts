import { isAccountConnected } from "../../core/refresh/scrape-window";
import { isSyncing } from "../../core/sync";
import {
  getAccount,
  listAccounts,
  patchAccount,
  removeAccount,
} from "../../core/sync/accounts";
import { fillMissingAvatars } from "../../core/sync/avatars";
import type { QueryHandlerMap } from "../helpers";

export const accountsQueries: QueryHandlerMap = {
  /** Every connected account, oldest first, with live connectivity and in-flight sync state; one row per account, not per platform. */
  async "accounts.list"() {
    /** Backfill profile pictures in the background; they show up on the next list call once resolved. */
    fillMissingAvatars();
    const accounts = await listAccounts();
    const rows = await Promise.all(
      accounts.map(async (account) => ({
        ...account,
        connected: await isAccountConnected(account).catch(() => false),
        syncing: isSyncing(account.id),
      })),
    );
    return { accounts: rows };
  },

  /** Manual handle entry: most sources can't probe it from the session, and without one there's no profile picture; clearing the avatar stamps re-checks under the new handle. */
  async "accounts.setHandle"(params) {
    const accountId = String(params.accountId ?? "");
    const raw = params.handle;
    const handle =
      typeof raw === "string" && raw.trim().length > 0 ? raw.trim() : null;
    const account = await patchAccount(accountId, {
      handle,
      avatarUrl: null,
      avatarCheckedAt: null,
    });
    if (account) fillMissingAvatars();
    return { ok: account !== null, account };
  },

  /** Renames the user-facing nickname; null clears it. */
  async "accounts.setLabel"(params) {
    const accountId = String(params.accountId ?? "");
    const raw = params.label;
    const label =
      typeof raw === "string" && raw.trim().length > 0 ? raw.trim() : null;
    const account = await patchAccount(accountId, { label });
    return { ok: account !== null, account };
  },

  /** Signs the account out: drops the registry entry and wipes its cookie jar; attributed saves keep their account_id. */
  async "accounts.disconnect"(params) {
    const accountId = String(params.accountId ?? "");
    const account = await getAccount(accountId);
    if (!account) return { ok: false };
    await removeAccount(accountId);
    return { ok: true };
  },
};
