import type { DisplayPrefs } from "@/lib/stores/display-prefs";

/* `.item` has `flex-direction: column; gap: 12px`. The 12px sits
 * between the media slot and the meta block (when meta is rendered
 * at all). Each meta line (title / time) is ~14px tall (`.title` /
 * `.time` font-size 10px, line-height ~1.3), and `.meta` itself has
 * a 4px inner gap between title and time. Packers need the total
 * chrome height below the media so row/column advances match what
 * the DOM actually consumes. */
const META_GAP_ABOVE = 12;
const META_LINE_H = 14;
const META_INNER_GAP = 4;

export function chromeHeightFor(prefs: DisplayPrefs): number {
  const lines = (prefs.name ? 1 : 0) + (prefs.date ? 1 : 0);
  if (lines === 0) return 0;
  if (lines === 1) return META_GAP_ABOVE + META_LINE_H;
  return META_GAP_ABOVE + META_LINE_H * 2 + META_INNER_GAP;
}
