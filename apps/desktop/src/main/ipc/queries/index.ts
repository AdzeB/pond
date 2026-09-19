import log from "electron-log/main.js";
import { z } from "zod";
import { IPC } from "../../../shared/constants";
import { registerPondOperations } from "../../core/agent/operations";
import { currentPondId } from "../../core/prefs-scope";
import { agentControlOperations } from "../agent-controls";
import { safeHandle } from "../helpers";
import { accountsQueries } from "./accounts";
import { actionQueries } from "./actions";
import { agentQueries } from "./agent";
import { agentOperationsForQueries } from "./agent-operations";
import { aiQueries } from "./ai";
import { bulkQueries } from "./bulk";
import { conversionQueries } from "./conversion";
import { downloadsQueries } from "./downloads";
import { foldersQueries } from "./folders";
import { inspectQueries } from "./inspect";
import { libraryQueries } from "./library";
import { openWithQueries } from "./open-with";
import type { QueryHandlerMap, QueryParams } from "./params";
import { savedViewsQueries } from "./saved-views";
import { savesQueries } from "./saves";
import { settingsQueries } from "./settings";
import { syncHistoryQueries } from "./sync-history";
import { tagGroupsQueries } from "./tag-groups";
import { tagsQueries } from "./tags";
import { transferJobsQueries } from "./transfer-jobs";
import { videoQueries } from "./video";
import { watchesQueries } from "./watches";

type ContractHandlers = Required<QueryHandlerMap>;

const queryRegistry = {
  ...transferJobsQueries,
  ...bulkQueries,
  ...openWithQueries,
  ...conversionQueries,
  ...actionQueries,
  ...savesQueries,
  ...downloadsQueries,
  ...settingsQueries,
  ...tagsQueries,
  ...tagGroupsQueries,
  ...savedViewsQueries,
  ...foldersQueries,
  ...libraryQueries,
  ...inspectQueries,
  ...videoQueries,
  ...syncHistoryQueries,
  ...aiQueries,
  ...agentQueries,
  ...accountsQueries,
  ...watchesQueries,
} satisfies ContractHandlers;

const QueryNameSchema = z.custom<keyof typeof queryRegistry>(
  (value) => z.enum(Object.keys(queryRegistry)).safeParse(value).success,
);

export function pondOperations() {
  return [
    ...agentOperationsForQueries(queryRegistry),
    ...agentControlOperations,
  ];
}

export function registerQueryHandler(): void {
  registerPondOperations({
    operations: pondOperations(),
    libraryId: currentPondId,
  });
  safeHandle(IPC.query, async (event, name: string, raw?: QueryParams) => {
    const parsedName = QueryNameSchema.safeParse(name);
    if (!parsedName.success) throw new Error(`unknown query: ${name}`);
    const handler = queryRegistry[parsedName.data];
    if (!handler) throw new Error(`unknown query: ${name}`);
    try {
      return await handler(raw, event);
    } catch (err) {
      log.error("[pond ipc] query failed", name, err);
      throw err;
    }
  });
}
