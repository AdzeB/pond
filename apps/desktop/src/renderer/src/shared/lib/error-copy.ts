import { isCatalogCopy } from "@shared/localization";

/** Electron prefixes errors that cross `ipcRenderer.invoke` with the channel and error name. */
const IPC_PREFIX = /^Error invoking remote method '[^']*': (?:\w*Error: )?/;

/** Product copy from the catalog reaches the screen; internal errors fall back to the caller's sentence. */
export function errorCopy(cause: unknown, fallback: string): string {
  if (!(cause instanceof Error)) return fallback;
  const message = cause.message.replace(IPC_PREFIX, "").trim();
  return isCatalogCopy(message) ? message : fallback;
}
