import log from "electron-log/main.js";
import { IPC } from "../../../shared/constants";
import { safeHandle } from "../helpers";
import { accountsQueries } from "./accounts";
import { agentQueries } from "./agent";
import { aiQueries } from "./ai";
import { downloadsQueries } from "./downloads";
import { foldersQueries } from "./folders";
import { libraryQueries } from "./library";
import type { QueryHandlerMap, QueryParams } from "./params";
import { savedViewsQueries } from "./saved-views";
import { savesQueries } from "./saves";
import { settingsQueries } from "./settings";
import { syncHistoryQueries } from "./sync-history";
import { tagGroupsQueries } from "./tag-groups";
import { tagsQueries } from "./tags";
import { videoQueries } from "./video";
import { watchesQueries } from "./watches";

const queryRegistry: QueryHandlerMap = {
  ...savesQueries,
  ...downloadsQueries,
  ...settingsQueries,
  ...tagsQueries,
  ...tagGroupsQueries,
  ...savedViewsQueries,
  ...foldersQueries,
  ...libraryQueries,
  ...videoQueries,
  ...syncHistoryQueries,
  ...aiQueries,
  ...agentQueries,
  ...accountsQueries,
  ...watchesQueries,
};

export function registerQueryHandler(): void {
  safeHandle(IPC.query, async (event, name: string, raw?: QueryParams) => {
    const handler = queryRegistry[name];
    if (!handler) throw new Error(`unknown query: ${name}`);
    try {
      return await handler(raw, event);
    } catch (err) {
      log.error("[pond ipc] query failed", name, err);
      throw err;
    }
  });
}
