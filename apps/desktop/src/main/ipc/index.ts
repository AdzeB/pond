import { registerAppHandlers } from "./handlers/app";
import { registerRefreshHandlers } from "./handlers/refresh";
import { registerSyncHandlers } from "./handlers/sync";
import { registerQueryHandler } from "./queries";

export function registerIpc(): void {
  registerAppHandlers();
  registerRefreshHandlers();
  registerSyncHandlers();
  registerQueryHandler();
}
