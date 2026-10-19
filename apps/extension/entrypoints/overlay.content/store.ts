import { Toast } from "@pond/ui/toast";
import type { Folder } from "@/utils/messaging";
import type { CaptureStatus } from "@/utils/outcome";
import type { OverlayRequest, OverlayToast } from "@/utils/overlay-messaging";
import type { ThemeVars } from "@/utils/theme";

export type OverlayTool =
  | { view: "region" }
  | { view: "element" }
  | { view: "images"; folders: Folder[] };

export interface OverlayState {
  theme: ThemeVars | null;
  tool: OverlayTool | null;
}

export interface ToastData {
  status: CaptureStatus;
  saveId?: string;
}

const TOAST_TIMEOUT_MS = 4000;

const HEADINGS = {
  sending: "Saving to Pond",
  saved: "Saved to Pond",
  duplicate: "Already in Pond",
  failed: "Couldn't save",
  offline: "Pond isn't running",
} satisfies Record<CaptureStatus, string>;

const OFFLINE_HINT = "Open Pond on your computer, then try again.";

export type OverlayStore = ReturnType<typeof createOverlayStore>;

export function createOverlayStore() {
  let state: OverlayState = { theme: null, tool: null };
  const listeners = new Set<() => void>();
  const toasts = Toast.createToastManager<ToastData>();
  const live = new Set<string>();

  const set = (next: Partial<OverlayState>) => {
    state = { ...state, ...next };
    for (const listener of listeners) listener();
  };

  const toast = (input: OverlayToast) => {
    const options = {
      title: HEADINGS[input.status],
      description:
        input.message ??
        (input.status === "offline" ? OFFLINE_HINT : input.title),
      timeout: input.status === "sending" ? 0 : TOAST_TIMEOUT_MS,
      data: { status: input.status, saveId: input.saveId },
    };
    if (live.has(input.id)) {
      toasts.update(input.id, options);
      return;
    }
    live.add(input.id);
    toasts.add({
      ...options,
      id: input.id,
      onRemove: () => live.delete(input.id),
    });
  };

  return {
    toasts,
    getState: () => state,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    show(request: OverlayRequest, theme: ThemeVars | null) {
      if (theme) set({ theme });
      if (request.view === "clear") {
        toasts.close();
        set({ tool: null });
        return;
      }
      if (request.view === "toast") {
        toast(request.toast);
        return;
      }
      set({ tool: request });
    },
    closeTool() {
      set({ tool: null });
    },
  };
}
