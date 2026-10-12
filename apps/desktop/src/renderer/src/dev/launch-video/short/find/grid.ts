import { type Sample, sample } from "../../stage/media";
import { ease, mix, progress } from "../../stage/timeline";

const pick = (titles: readonly string[]) => titles.map(sample);

export const ALL = pick([
  "The interior of the Zweifel graphic design studio",
  "A Porsche 911 GT3 at a McDonald's drive-thru.",
  "Long black coat",
  "my summer essentials !!",
  "Light study",
  "Lemaire AW25, look 28",
  "Ikebana",
  "Carros y camionetas",
  "Layered work jacket",
  "Desk at night",
  "April shower",
  "Dream wardrobe",
  "Modern Gray Leather Chair with Footrests",
  "Dark academia outfit",
  "Natural Selection",
  "Patchwork knit",
  "Auralee FW26, look 22",
  "A wicker chair designed by John Dickinson.",
]);

export const FALL = pick([
  "Fall Outfits You'll FALL in Love With",
  "Long black coat",
  "Dark academia outfit",
  "Lemaire AW25, look 28",
  "Balloon Washed Denims",
  "セーター衣装",
  "Layered work jacket",
  "Auralee FW26, look 22",
  "Same but diff ! Looks for the week!",
  "Black coat, round sunglasses",
  "Patchwork knit",
  "ssstein 2026FW, 5th delivery",
  "Black suit, long hair",
  "Black coat, black boots",
  "Aimé Leon Dore Yankees hand-knit sweater",
  "Fun night out, fun outfits <3",
  "Grey suit, white shirt",
  "Dream wardrobe",
]);

export const BROWN = pick([
  "Long black coat",
  "Lemaire AW25, look 28",
  "Dream wardrobe",
  "Layered work jacket",
  "Balloon Washed Denims",
  "Same but diff ! Looks for the week!",
  "Patchwork knit",
  "ssstein 2026FW, 5th delivery",
  "Black suit, long hair",
  "Black coat, black boots",
  "Fun night out, fun outfits <3",
  "Grey suit, white shirt",
]);

const COLUMNS = 7;
const GAP = 16;
/** The caption under each thumbnail: a 12px gap, then title and date. */
const CAPTION = 44;
export const CARD = { width: 130, caption: CAPTION };
const GRID = { x: 20, y: 109 };

export const imageHeight = (entry: Sample) => CARD.width / entry.aspect;

/** Waterfall slots, each card dropping into the shortest column like the library does. */
function waterfall(list: readonly Sample[]) {
  const heights = Array.from({ length: COLUMNS }, () => 0);
  return list.map((entry) => {
    const column = heights.indexOf(Math.min(...heights));
    const y = heights[column] ?? 0;
    heights[column] = y + imageHeight(entry) + CAPTION + GAP;
    return { x: GRID.x + column * (CARD.width + GAP), y: GRID.y + y };
  });
}

export interface Step {
  at: number;
  list: readonly Sample[];
}

export interface Placed {
  entry: Sample;
  x: number;
  y: number;
  scale: number;
  opacity: number;
}

/** Every card's place at `t`: shared cards glide from the last step's slots, others fade where they stand. */
export function place(t: number, steps: readonly Step[]): Placed[] {
  let index = 0;
  while (index < steps.length - 1 && t >= (steps[index + 1]?.at ?? 0)) index++;
  const to = steps[index];
  const from = steps[index - 1] ?? to;
  if (!from || !to) return [];
  const before = waterfall(from.list);
  const after = waterfall(to.list);
  const ids = new Map<string, Sample>();
  for (const entry of [...from.list, ...to.list]) ids.set(entry.id, entry);
  return [...ids.values()].flatMap((entry) => {
    const a = from.list.findIndex((item) => item.id === entry.id);
    const b = to.list.findIndex((item) => item.id === entry.id);
    const order = Math.max(a, b, 0);
    const p = before[a];
    const q = after[b];
    if (p && q) {
      const k = ease.inOut(progress(t, to.at + order * 14, 620));
      return [
        {
          entry,
          x: mix(p.x, q.x, k),
          y: mix(p.y, q.y, k),
          scale: 1,
          opacity: 1,
        },
      ];
    }
    if (p) {
      const gone = ease.out(progress(t, to.at + order * 10, 320));
      return [{ entry, ...p, scale: mix(1, 0.9, gone), opacity: 1 - gone }];
    }
    if (!q) return [];
    const come = ease.outQuint(progress(t, to.at + 180 + order * 14, 600));
    return [{ entry, ...q, scale: mix(0.9, 1, come), opacity: come }];
  });
}
