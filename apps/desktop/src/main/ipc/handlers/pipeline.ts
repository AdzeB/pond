import { IPC } from "../../../shared/constants";
import {
  cancelAllIngest,
  cancelSaveIngest,
  isReconcilerPaused,
  pauseReconciler,
  resumeReconciler,
} from "../../core/pipeline/reconciler";
import { safeHandle } from "../helpers";

export function registerPipelineHandlers(): void {
  safeHandle(IPC.pipelinePause, async (_, paused: boolean) => {
    if (paused) pauseReconciler();
    else resumeReconciler();
    return { ok: true as const, paused: isReconcilerPaused() };
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
