import log from "electron-log/main.js";
import { z } from "zod";
import { IPC } from "../../../shared/constants";
import { registerPondOperations } from "../../core/agent/operations";
import { currentPondId } from "../../core/prefs-scope";
import { assertLibraryUnlocked } from "../../core/security/app-lock-runtime";
import {
  folderSecurityStatus,
  saveIsLocked,
} from "../../core/security/folder-passwords";
import { localizeMainError } from "../../localization-runtime";
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
import { securityQueries } from "./security";
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
  ...securityQueries,
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

const LOCKED_QUERY_ALLOWLIST = new Set<keyof typeof queryRegistry>([
  "security.status",
  "security.unlock",
  "security.unlockRecovery",
  "security.unlockBiometric",
  "security.lockNow",
  "security.setup",
  "library.recent",
  "library.switchTo",
]);

const AuthorizationIdentifierSchema = z.coerce
  .string()
  .nullish()
  .transform((value) => value ?? "")
  .catch("");
const AuthorizationIdentifierListSchema = z.array(z.coerce.string()).catch([]);
const AuthorizationInputSchema = z.object({
  id: AuthorizationIdentifierSchema,
  ids: AuthorizationIdentifierListSchema,
  saveId: AuthorizationIdentifierSchema,
  saveIds: AuthorizationIdentifierListSchema,
  folderId: AuthorizationIdentifierSchema,
  folderIds: AuthorizationIdentifierListSchema,
  parentId: AuthorizationIdentifierSchema,
  beforeId: AuthorizationIdentifierSchema,
  addIds: AuthorizationIdentifierListSchema,
  removeIds: AuthorizationIdentifierListSchema,
});
type AuthorizationInput = z.infer<typeof AuthorizationInputSchema>;

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
      if (!LOCKED_QUERY_ALLOWLIST.has(parsedName.data)) {
        assertLibraryUnlocked();
        const input = AuthorizationInputSchema.parse(raw ?? {});
        await assertUnlockedSaveTargets(parsedName.data, input);
        await assertUnlockedFolderMutationTargets(parsedName.data, input);
      }
      return await handler(raw, event);
    } catch (err) {
      log.error("[pond ipc] query failed", name, err);
      if (err instanceof Error) throw localizeMainError(err);
      throw err;
    }
  });
}

const FOLDER_MUTATIONS = new Set<keyof typeof queryRegistry>([
  "folders.createBatch",
  "folders.moveBatch",
  "folders.rules.set",
  "folders.move",
  "folders.assign",
  "folders.metadata.set",
  "folders.create",
  "folders.rename",
  "folders.setColor",
  "folders.delete",
  "folders.setSaveFolders",
  "folders.addSaves",
]);

async function assertUnlockedFolderMutationTargets(
  name: keyof typeof queryRegistry,
  input: AuthorizationInput,
): Promise<void> {
  if (!FOLDER_MUTATIONS.has(name)) return;
  const saveIds = new Set([input.saveId, ...input.saveIds].filter(Boolean));
  const folderIds = new Set(
    [
      input.id,
      ...input.ids,
      input.folderId,
      ...input.folderIds,
      input.parentId,
      input.beforeId,
      ...input.addIds,
      ...input.removeIds,
    ].filter(Boolean),
  );
  for (const id of saveIds) {
    if (await saveIsLocked(id))
      throw new Error("This Save is in a locked folder.");
  }
  for (const id of folderIds) {
    if ((await folderSecurityStatus(id)).locked)
      throw new Error("This folder is locked.");
  }
}

async function assertUnlockedSaveTargets(
  name: keyof typeof queryRegistry,
  input: AuthorizationInput,
): Promise<void> {
  if (!name.startsWith("saves.")) return;
  const ids = new Set(
    [input.id, input.saveId, ...input.ids, ...input.saveIds].filter(Boolean),
  );
  for (const id of ids) {
    if (await saveIsLocked(id)) {
      throw new Error("This Save is in a locked folder.");
    }
  }
}
