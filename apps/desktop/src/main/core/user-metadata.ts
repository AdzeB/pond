import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { writeBundleJson } from "../lib/library-config";
import { itemDir } from "../paths";

function preserveUserTitle(id: string): void {
  writeBundleJson(join(itemDir(id), "user-title.json"), { locked: true });
}
export function hasUserTitle(id: string): boolean {
  return existsSync(join(itemDir(id), "user-title.json"));
}

export function setUserTitleLock(id: string, locked: boolean): void {
  if (locked) preserveUserTitle(id);
  else rmSync(join(itemDir(id), "user-title.json"), { force: true });
}
