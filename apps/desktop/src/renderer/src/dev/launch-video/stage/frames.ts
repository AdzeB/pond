import type { Director } from "../director";

export const FRAME = { width: 1110, height: 560 } as const;
export const FRAME_SRC = "/launch-video-app.html";

let element: HTMLIFrameElement | null = null;

export function registerFrame(next: HTMLIFrameElement | null) {
  element = next;
}

export function director(): Director | null {
  const view = element?.contentWindow as
    | (Window & { __director?: Director })
    | null
    | undefined;
  return view?.__director ?? null;
}
