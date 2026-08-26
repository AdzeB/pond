import type { DisplayPrefs } from "@/stores/display-prefs";

const META_GAP_ABOVE = 12;
const META_LINE_H = 14;
const META_INNER_GAP = 4;

export function chromeHeightFor(prefs: DisplayPrefs): number {
  const lines = (prefs.name ? 1 : 0) + (prefs.date ? 1 : 0);
  if (lines === 0) return 0;
  if (lines === 1) return META_GAP_ABOVE + META_LINE_H;
  return META_GAP_ABOVE + META_LINE_H * 2 + META_INNER_GAP;
}
