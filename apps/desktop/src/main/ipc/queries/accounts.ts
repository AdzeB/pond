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
  async "accounts.list"() {
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

  async "accounts.setLabel"(params) {
    const accountId = String(params.accountId ?? "");
    const raw = params.label;
    const label =
      typeof raw === "string" && raw.trim().length > 0 ? raw.trim() : null;
    const account = await patchAccount(accountId, { label });
    return { ok: account !== null, account };
  },

  async "accounts.disconnect"(params) {
    const accountId = String(params.accountId ?? "");
    const account = await getAccount(accountId);
    if (!account) return { ok: false };
    await removeAccount(accountId);
    return { ok: true };
  },
};
