import { IPC } from "../../../shared/constants";
import {
  cancelAllIngest,
  cancelSaveIngest,
  setReconcilerPaused,
} from "../../core/pipeline/reconciler-client";
import { safeHandle } from "../helpers";

export function registerPipelineHandlers(): void {
  safeHandle(IPC.pipelinePause, async (_, paused: boolean) => {
    return { ok: true as const, paused: await setReconcilerPaused(paused) };
  });

  safeHandle(IPC.pipelineCancelSave, async (_, id: string) => {
    const cancelled = await cancelSaveIngest(String(id));
    return { ok: true as const, cancelled };
  });

  safeHandle(IPC.pipelineCancelAll, async () => {
    const cancelled = await cancelAllIngest();
    return { ok: true as const, cancelled };
  });
}
