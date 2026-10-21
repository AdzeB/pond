import { basename } from "node:path";
import type { LibraryQueryRequest } from "../../shared/library-query";
import { getDb } from "../db";
import { resolvePaths } from "../paths";
import { queryLibraryIds, queryLibraryPage } from "./library-query";
import { getPrefs } from "./prefs";

async function activeScope(request: LibraryQueryRequest) {
  const view = request.orderFolderId
    ? (await getPrefs()).folderViews[request.orderFolderId]
    : undefined;
  return [
    await getDb(),
    basename(resolvePaths().indexDb, ".db"),
    request,
    request.sortKey === "manual" ? (view?.manualOrder ?? []) : [],
    view?.pinnedIds ?? [],
  ] as const;
}

export async function queryActiveLibraryPage(request: LibraryQueryRequest) {
  return queryLibraryPage(...(await activeScope(request)));
}

export async function queryActiveLibraryIds(request: LibraryQueryRequest) {
  return queryLibraryIds(...(await activeScope(request)));
}
