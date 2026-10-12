import type { Director } from "../director";

export type FrameId = "app" | "settings";

export const FRAME_SIZE: Record<FrameId, { width: number; height: number }> = {
  app: { width: 1440, height: 810 },
  settings: { width: 960, height: 760 },
};

export const FRAME_SRC: Record<FrameId, string> = {
  app: "/launch-video-app.html",
  settings: "/launch-video-settings.html?section=processing",
};

const elements = new Map<FrameId, HTMLIFrameElement>();

export function registerFrame(id: FrameId, element: HTMLIFrameElement | null) {
  if (element) elements.set(id, element);
  else elements.delete(id);
}

export function director(id: FrameId): Director | null {
  const view = elements.get(id)?.contentWindow as
    | (Window & { __director?: Director })
    | null
    | undefined;
  return view?.__director ?? null;
}

export function frameWindow(id: FrameId): Window | null {
  return elements.get(id)?.contentWindow ?? null;
}
