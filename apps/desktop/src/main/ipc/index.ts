import { ipcMain } from "electron";
import { registerPreviewWindowHandlers } from "../core/preview-windows";
import { registerAgentStream } from "./handlers/agent-stream";
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
  registerAgentStream();
  registerPreviewWindowHandlers(ipcMain);
}
