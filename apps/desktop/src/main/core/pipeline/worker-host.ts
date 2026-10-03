import { stat } from "node:fs/promises";
import { isAbsolute, join } from "node:path";
import { app, utilityProcess } from "electron";
import log from "electron-log/main.js";
import { ulid } from "ulid";
import { QueueWorkerResponseSchema } from "./worker-contract";
import {
  createQueueWorkerHost,
  type QueueWorkerResult,
} from "./worker-host-core";

function workerEntry(): string {
  return join(__dirname, "queue-worker.js");
}

const host = createQueueWorkerHost({
  spawn: () => {
    if (!app.isReady()) {
      throw new Error("Queue workers require Electron to be ready.");
    }
    const child = utilityProcess.fork(workerEntry(), [], {
      serviceName: "Pond Queue Worker",
      stdio: "ignore",
    });
    return {
      onMessage: (listener) => {
        child.on("message", (message) => {
          const response = QueueWorkerResponseSchema.safeParse(message);
          if (response.success) listener(response.data);
        });
      },
      onExit: (listener) => {
        child.on("exit", listener);
      },
      postMessage: (request) => child.postMessage(request),
      kill: () => child.kill(),
    };
  },
  createJobId: ulid,
  validateSourcePath: async (path) => {
    if (!isAbsolute(path)) return false;
    const info = await stat(path);
    return info.isFile();
  },
  onStopped: () => log.info("[pond queue workers] stopped"),
});

export type { QueueWorkerResult } from "./worker-host-core";

export async function runQueueWorkerJob(
  ...args: Parameters<typeof host.run>
): Promise<QueueWorkerResult> {
  return host.run(...args);
}

export function disposeQueueWorkerHost(): void {
  host.dispose();
}
