import type {
  ScreenshotCaptureResult,
  ScreenshotMode,
  ScreenshotSaveInput,
} from "../../shared/screenshot-capture";
import type { createScreenshotCapture } from "./screenshot-capture";

interface ScreenshotWorkflowPorts {
  capture: ReturnType<typeof createScreenshotCapture>;
  prepare(): Promise<number | null>;
  focus(): boolean;
  open(): Promise<void>;
  destroy(): void;
  restore(origin: number | null): Promise<void>;
  afterSave(id: string, origin: number | null): Promise<void>;
}

export function createScreenshotWorkflow(ports: ScreenshotWorkflowPorts) {
  let origin: number | null = null;
  let starting = false;
  let generation = 0;
  let savedId: string | null = null;
  return {
    async begin(mode: ScreenshotMode): Promise<ScreenshotCaptureResult> {
      if (ports.focus() || starting) return { kind: "organizing" };
      starting = true;
      const current = generation;
      try {
        savedId = null;
        origin = await ports.prepare();
        if (current !== generation) return { kind: "cancelled" };
        const result = await ports.capture.begin(mode);
        if (current !== generation) {
          if (result.kind === "draft")
            ports.capture.discard(result.draft.token);
          return { kind: "cancelled" };
        }
        if (result.kind === "draft") {
          try {
            await ports.open();
          } catch (error) {
            ports.capture.discard(result.draft.token);
            throw error;
          }
          return { kind: "organizing" };
        }
        if (result.kind === "saved") await ports.afterSave(result.id, origin);
        return result;
      } finally {
        starting = false;
      }
    },
    async finish(input: ScreenshotSaveInput): Promise<{ id: string }> {
      const result = await ports.capture.finish(input);
      savedId = result.id;
      return result;
    },
    async close(): Promise<boolean> {
      if (ports.capture.isBusy()) return false;
      const draft = ports.capture.draft();
      if (draft) ports.capture.discard(draft.token);
      const completed = savedId;
      savedId = null;
      if (completed) await ports.afterSave(completed, origin);
      else await ports.restore(origin);
      return true;
    },
    shutdown(): void {
      generation += 1;
      const draft = ports.capture.draft();
      if (draft) ports.capture.discard(draft.token);
      ports.destroy();
      origin = null;
      savedId = null;
    },
  };
}
