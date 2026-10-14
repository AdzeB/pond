/** Which part of the app frame the stage window shows, and how it enters and leaves. */
import { QUESTION } from "../constants";
import { closes, lift, opens } from "./timeline";

export const WINDOW = { x: 320, y: 290, width: 1280, height: 740 } as const;

/** Frame-space crop whose left, top, and width fill the stage window. */
interface Crop {
  x: number;
  y: number;
  width: number;
}

/** The library or Assistant content panel, without the sidebar. */
const PANEL: Crop = { x: 229, y: 45, width: 881 };

export const FILTER_AT = opens("find") + 1980;
export const ASK_AT = opens("ask") + 820;
export const ASK_STEP = 32;
export const SEND_AT = ASK_AT + QUESTION.length * ASK_STEP + 600;

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
    return { crop: PANEL, ...w };
  }
  return null;
}
