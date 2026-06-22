import { registerAppHandlers } from "./handlers/app";
import { registerMenuHandlers } from "./handlers/menu";
import { registerRefreshHandlers } from "./handlers/refresh";
import { registerSyncHandlers } from "./handlers/sync";
import { registerQueryHandler } from "./queries";

export function registerIpc(): void {
  registerAppHandlers();
  registerMenuHandlers();
  registerRefreshHandlers();
  registerSyncHandlers();
  registerQueryHandler();
}
