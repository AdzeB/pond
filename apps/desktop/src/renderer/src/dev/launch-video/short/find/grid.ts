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

const COLUMNS = 6;
export const CARD = { width: 200, image: 250, row: 316, gap: 18 };
const GRID = { x: 24, y: 142 };

const slot = (index: number) => ({
  x: GRID.x + (index % COLUMNS) * (CARD.width + CARD.gap),
  y: GRID.y + Math.floor(index / COLUMNS) * CARD.row,
});

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

/** Every card's place at `t`: shared cards glide between slots, others fade in or out where they stand. */
export function place(t: number, steps: readonly Step[]): Placed[] {
  const ids = new Map<string, Sample>();
  for (const step of steps)
    for (const entry of step.list) ids.set(entry.id, entry);
  let index = 0;
  while (index < steps.length - 1 && t >= (steps[index + 1]?.at ?? 0)) index++;
  const from = steps[index];
  const to = steps[index + 1];
  if (!from) return [];
  return [...ids.values()].flatMap((entry) => {
    const a = from.list.findIndex((item) => item.id === entry.id);
    const b = to ? to.list.findIndex((item) => item.id === entry.id) : -1;
    const order = Math.max(a, b, 0);
    const k = to ? ease.inOut(progress(t, to.at + order * 14, 620)) : 0;
    if (a < 0 && b < 0) return [];
    if (a >= 0 && b >= 0) {
      const p = slot(a);
      const q = slot(b);
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
    if (a >= 0) {
      const p = slot(a);
      const gone = to ? ease.out(progress(t, to.at + order * 10, 320)) : 0;
      return [{ entry, ...p, scale: mix(1, 0.9, gone), opacity: 1 - gone }];
    }
    const q = slot(b);
    const come = ease.outQuint(
      progress(t, (to?.at ?? 0) + 180 + order * 14, 600),
    );
    return [{ entry, ...q, scale: mix(0.9, 1, come), opacity: come }];
  });
}
