import { closeSync, mkdirSync, openSync } from "node:fs";
import { join } from "node:path";
import type { App } from "electron";

/** Logging is optional: a denied system logs directory must not prevent startup. */
export function resolveLogFile(
  app: Pick<App, "getPath" | "setAppLogsPath">,
): string | null {
  for (const directory of [
    () => app.getPath("logs"),
    () => join(app.getPath("userData"), "logs"),
  ]) {
    try {
      const root = directory();
      mkdirSync(root, { recursive: true });
      const file = join(root, "main.log");
      // An existing directory can be writable while its log file is not.
      closeSync(openSync(file, "a"));
      app.setAppLogsPath(root);
      return file;
    } catch {}
  }
  return null;
}
