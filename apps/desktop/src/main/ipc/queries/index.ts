import log from "electron-log/main.js";
import { z } from "zod";
import { IPC } from "../../../shared/constants";
import { SCREENSHOT_QUERY_NAMES } from "../../../shared/screenshot-window-contracts";
import { SETTINGS_QUERY_NAMES } from "../../../shared/settings-window-contracts";
import { registerPondOperations } from "../../core/agent/operations";
import { currentPondId } from "../../core/prefs-scope";
import { screenshotWindowOwnsSender } from "../../core/screenshot-window";
import { settingsWindowOwnsSender } from "../../core/settings-window";
import { localizeMainError } from "../../localization-runtime";
import { agentControlOperations } from "../agent-controls";
import { safeHandle } from "../helpers";
import { accountsQueries } from "./accounts";
import { agentQueries } from "./agent";
import { agentOperationsForQueries } from "./agent-operations";
import { bulkQueries } from "./bulk";
import { conversionQueries } from "./conversion";
import { downloadsQueries } from "./downloads";
import { foldersQueries } from "./folders";
import { inspectQueries } from "./inspect";
import { libraryQueries } from "./library";
import { libraryRepairQueries } from "./library-repairs";
import { openWithQueries } from "./open-with";
import type { QueryHandlerMap, QueryParams } from "./params";
import { queueQueries } from "./queue";
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
  ...savesQueries,
  ...downloadsQueries,
  ...queueQueries,
  ...settingsQueries,
  ...tagsQueries,
  ...tagGroupsQueries,
  ...savedViewsQueries,
  ...foldersQueries,
  ...libraryQueries,
  ...libraryRepairQueries,
  ...inspectQueries,
  ...videoQueries,
  ...syncHistoryQueries,
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
    if (
      (screenshotWindowOwnsSender(event.sender.id) &&
        !SCREENSHOT_QUERY_NAMES.has(parsedName.data)) ||
      (settingsWindowOwnsSender(event.sender.id) &&
        !SETTINGS_QUERY_NAMES.has(parsedName.data))
    ) {
      throw new Error("This action is unavailable in this window.");
    }
    const handler = queryRegistry[parsedName.data];
    if (!handler) throw new Error(`unknown query: ${name}`);
    try {
      return await handler(raw, event);
    } catch (err) {
      log.error("[pond ipc] query failed", name, err);
      if (err instanceof Error) throw localizeMainError(err);
      throw err;
    }
  });
}
