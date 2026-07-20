import { registerAppHandlers } from "./handlers/app";
import { registerPipelineHandlers } from "./handlers/pipeline";
import { registerRefreshHandlers } from "./handlers/refresh";
import { registerSyncHandlers } from "./handlers/sync";
import { registerQueryHandler } from "./queries";

export function registerIpc(): void {
  registerAppHandlers();
  registerPipelineHandlers();
  registerRefreshHandlers();
  registerSyncHandlers();
  registerQueryHandler();
}
