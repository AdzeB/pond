import { app } from "electron";
import { enqueue, libraryInfo, sessionImport, sessionPending } from "../ops";
import type { NativePorts } from "./rpc";

export function liveNativePorts(): NativePorts {
  return {
    enqueue: (url, opts) => enqueue(url, opts),
    libraryInfo,
    sessionPending,
    sessionImport,
    appVersion: () => app.getVersion(),
  };
}
