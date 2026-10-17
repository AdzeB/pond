import type { SaveStatus } from "@pond/schema/db";

export function harvestShouldIgnoreSave(save: {
  status: SaveStatus;
  deletedAt: Date | null;
}): boolean {
  return save.status === "skipped" || save.deletedAt != null;
}

/** Disconnecting keeps an account's saves; the reconnected account that lists them takes them over so its sync baseline counts them. */
export function harvestShouldAdoptSave(
  save: { accountId: string | null },
  accountId: string | undefined,
  connectedAccountIds: ReadonlySet<string>,
): boolean {
  if (!accountId || save.accountId === null) return false;
  if (save.accountId === accountId) return false;
  return !connectedAccountIds.has(save.accountId);
}

export function harvestShouldReseedFailedSave(
  save: {
    status: SaveStatus;
    deletedAt: Date | null;
  },
  hasSeed: boolean,
): boolean {
  return hasSeed && save.status === "failed" && !harvestShouldIgnoreSave(save);
}
