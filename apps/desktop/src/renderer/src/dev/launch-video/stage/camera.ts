/** Which part of the app frame the stage window shows, and how it enters and leaves. */
import { closes, ease, type Key, keyframes, lift, opens } from "./timeline";

export const WINDOW = { x: 320, y: 290, width: 1280, height: 740 } as const;

/** Frame-space crop whose left, top, and width fill the stage window. */
interface Crop extends Record<string, number> {
  x: number;
  y: number;
  width: number;
}

/** The library or Assistant content panel, without the sidebar. */
const PANEL: Crop = { x: 229, y: 45, width: 1202 };
const FILTERS: Crop = { x: 229, y: 45, width: 1000 };

export const FILTER_AT = opens("find") + 1500;

const FIND: readonly Key<Crop>[] = [
  [FILTER_AT - 200, PANEL],
  [FILTER_AT + 600, FILTERS],
];

export interface Shot {
  crop: Crop;
  opacity: number;
  dy: number;
  blur: number;
}

export function shot(t: number): Shot | null {
  for (const beat of ["find", "ask"] as const) {
    const w = lift(t, opens(beat), closes(beat));
    if (w.opacity <= 0) continue;
    const crop = beat === "find" ? keyframes(t, FIND, ease.inOut) : PANEL;
    return { crop, ...w };
  }
  return null;
}
