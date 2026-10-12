/** Where each app window sits on the 1920×1080 stage over time. */
import type { FrameId } from "./frames";
import { BEATS, ease, type Key, keyframes } from "./timeline";

export interface Shot extends Record<string, number> {
  x: number;
  y: number;
  scale: number;
  opacity: number;
}

/** Places frame point (ax, ay) at stage point (sx, sy). */
function anchor(
  ax: number,
  ay: number,
  sx: number,
  sy: number,
  scale: number,
  opacity = 1,
): Shot {
  return { x: sx - ax * scale, y: sy - ay * scale, scale, opacity };
}

const hidden = (shot: Shot, dy = 40): Shot => ({
  ...shot,
  y: shot.y + dy,
  scale: shot.scale * 0.97,
  opacity: 0,
});

const appRest = anchor(720, 0, 960, 200, 1);
const appFind = anchor(470, 40, 700, 250, 1.3);
const appReply = anchor(1240, 30, 1180, 210, 1.5);
const appTheme = anchor(720, 405, 700, 640, 0.8);

const APP: readonly Key<Shot>[] = [
  [BEATS.sync[0], hidden(appRest, 60)],
  [BEATS.sync[0] + 700, appRest],
  [BEATS.sync[1] - 300, anchor(720, 0, 960, 196, 1.04)],
  [BEATS.sync[1], hidden(anchor(720, 0, 960, 196, 1.04), -20)],
  [BEATS.find[0], hidden(appRest, 60)],
  [BEATS.find[0] + 600, appRest],
  [BEATS.find[0] + 1500, appRest],
  [BEATS.find[0] + 2400, appFind],
  [BEATS.find[1] - 200, anchor(470, 60, 700, 250, 1.3)],
  [BEATS.ask[0] + 600, appRest],
  [BEATS.ask[0] + 1900, appRest],
  [BEATS.ask[0] + 2700, appReply],
  [BEATS.ask[1] - 300, anchor(1240, 30, 1180, 200, 1.54)],
  [BEATS.theme[0] + 700, appTheme],
  [BEATS.theme[1] - 300, appTheme],
  [BEATS.theme[1], hidden(appTheme, -20)],
];

const settingsRest = anchor(480, 0, 960, 200, 1.05);

const SETTINGS: readonly Key<Shot>[] = [
  [BEATS.enrich[0], hidden(settingsRest, 60)],
  [BEATS.enrich[0] + 700, settingsRest],
  [BEATS.enrich[0] + 1300, anchor(588, 0, 960, 200, 1.22)],
  [BEATS.enrich[1] - 300, anchor(588, 0, 960, 196, 1.25)],
  [BEATS.enrich[1], hidden(anchor(588, 0, 960, 196, 1.25), -20)],
  [BEATS.theme[0] + 300, hidden(anchor(480, 380, 1420, 690, 0.9), 80)],
  [BEATS.theme[0] + 1100, anchor(480, 380, 1420, 690, 0.9)],
  [BEATS.theme[1] - 300, anchor(480, 380, 1420, 690, 0.9)],
  [BEATS.theme[1], hidden(anchor(480, 380, 1420, 690, 0.9), -20)],
  [BEATS.connect[0], hidden(anchor(480, 0, 700, 200, 1), 60)],
  [BEATS.connect[0] + 700, anchor(480, 0, 700, 200, 1)],
  [BEATS.connect[1] - 300, anchor(480, 0, 690, 196, 1.02)],
  [BEATS.connect[1], hidden(anchor(480, 0, 690, 196, 1.02), -20)],
];

const OFF: Shot = { x: 0, y: 0, scale: 1, opacity: 0 };

export function shot(id: FrameId, t: number): Shot {
  const keys = id === "app" ? APP : SETTINGS;
  const first = keys[0]?.[0] ?? 0;
  const last = keys[keys.length - 1]?.[0] ?? 0;
  if (t < first || t > last) return OFF;
  return keyframes(t, keys, ease.inOut);
}
