import type { DisplayPrefs } from "@/stores/display-prefs";

/**
 * Mirrors the card CSS: `.item` has a 12px gap above the meta block, each meta line is ~14px tall, and `.meta` has a 4px inner gap.
 * @remarks Packers need the total chrome height below the media so row/column advances match what the DOM actually consumes.
 */
const META_GAP_ABOVE = 12;
const META_LINE_H = 14;
const META_INNER_GAP = 4;

export function chromeHeightFor(prefs: DisplayPrefs): number {
  const lines = (prefs.name ? 1 : 0) + (prefs.date ? 1 : 0);
  if (lines === 0) return 0;
  if (lines === 1) return META_GAP_ABOVE + META_LINE_H;
  return META_GAP_ABOVE + META_LINE_H * 2 + META_INNER_GAP;
}
