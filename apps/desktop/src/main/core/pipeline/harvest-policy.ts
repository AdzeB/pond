import type { SaveStatus } from "@pond/schema/db";

export function harvestShouldIgnoreSave(save: {
  status: SaveStatus;
  deletedAt: Date | null;
}): boolean {
  return save.status === "skipped" || save.deletedAt != null;
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
