import { BRANDS, brand } from "../../stage/brands";
import { SAMPLES, type Sample } from "../../stage/media";
import {
  clamp,
  ease,
  envelope,
  mix,
  progress,
  styled,
} from "../../stage/timeline";
import { Caption } from "../caption";
import { Card } from "../card";
import { CARD, waterfall } from "../find/grid";
import { Mac } from "../mac";
import { end, live, start } from "../timeline";
import { Toolbar } from "../toolbar";
import styles from "./styles.module.css";

const S = start("sources");
const EXIT = end("sources") - 350;
const FLOW = S + 1000;
const SPAN = 1900;
const FLIGHT = 850;
const TOTAL = 54;

/** The window drawn at 0.8, so one app pixel is one stage pixel. */
const WINDOW = { x: 320, y: 330, scale: 0.8 };
const PANEL = { x: WINDOW.x + 228, y: WINDOW.y + 44 };
const ROW_Y = 236;
const TILE = 64;
const TILE_GAP = 20;
const VISIBLE = 600;

const tileX = (k: number) =>
  960 -
  (BRANDS.length * TILE + (BRANDS.length - 1) * TILE_GAP) / 2 +
  k * (TILE + TILE_GAP) +
  TILE / 2;

/** Covers with white edges read as gaps in the grid, so the funnel leaves them out. */
const BRIGHT = new Set([
  "Coot - AI iOS device installs and IPA sharing",
  "Rolof lauren beanie outfit",
  "Modern Gray Leather Chair with Footrests",
  "Aimé Leon Dore Yankees hand-knit sweater",
  "i just ordered it cmon man",
  "Black suit, long hair",
  "Long black coat",
  "Natural Selection",
  "Lemaire AW25, look 28",
  "We built a tool to turn any company website into a Jingle.",
  "few ways to do the CSS for this",
  "Agents make ugly UIs because they've never seen good design.",
  "Complete end-to-end Sign In/Sign Up flows.",
]);

const sourceOf = (entry: Sample) =>
  brand(entry.source === "twitter" ? "x" : entry.source).id;

/** Every save worth showing, dealt round-robin across sources so each icon keeps firing. */
const FEED = (() => {
  const pools = new Map<string, Sample[]>();
  for (const entry of SAMPLES) {
    if (BRIGHT.has(entry.title)) continue;
    const id = sourceOf(entry);
    pools.set(id, [...(pools.get(id) ?? []), entry]);
  }
  const lists = [...pools.values()];
  const out: Sample[] = [];
  for (let round = 0; out.length < SAMPLES.length; round++) {
    const before = out.length;
    for (const list of lists) {
      const entry = list[round];
      if (entry) out.push(entry);
    }
    if (out.length === before) break;
  }
  return out;
})();

const SLOTS = waterfall(FEED);
const CARDS = FEED.flatMap((entry, k) => {
  const slot = SLOTS[k];
  if (!slot || slot.y > VISIBLE) return [];
  const id = sourceOf(entry);
  return [{ entry, slot, from: BRANDS.findIndex((item) => item.id === id) }];
}).map((card, k, list) => ({
  ...card,
  launch: FLOW + SPAN * Math.sqrt(k / list.length),
  spin: ((k * 37) % 25) - 12,
}));

/** Saves from every source funnelling into one library on your Mac, as the count climbs. */
export function Sources({ t }: { t: number }) {
  if (!live(t, "sources")) return null;
  const e = envelope(t, S + 250, EXIT, { rise: 40, duration: 800 });
  let landed = 0;
  for (const card of CARDS) {
    landed += progress(t, card.launch + FLIGHT * 0.6, 200);
  }
  const count = Math.round((TOTAL * landed) / CARDS.length);
  return (
    <>
      <Caption
        t={t}
        y={120}
        text="Everything you save, in one library on your Mac."
        enter={S + 100}
        exit={EXIT - 100}
      />
      {BRANDS.map(({ id, Icon }, k) => (
        <span
          key={id}
          className={styles.tile}
          style={{
            left: tileX(k) - TILE / 2,
            top: ROW_Y - TILE / 2,
            ...styled(
              envelope(t, S + 350 + k * 60, EXIT - 100 + k * 20, {
                duration: 550,
                rise: 16,
              }),
            ),
          }}
        >
          <Icon className={styles.logo} />
        </span>
      ))}
      <div
        className={styles.library}
        style={styled(e, `scale(${WINDOW.scale})`)}
      >
        <Mac.Window place="all" counts={{ all: count, added: count }}>
          <Mac.Panel>
            <Toolbar />
          </Mac.Panel>
        </Mac.Window>
      </div>
      <div className={styles.flight} style={styled(e)}>
        {CARDS.map((card) => {
          if (t < card.launch) return null;
          const p = ease.outQuint(progress(t, card.launch, FLIGHT));
          const scale = mix(0.25, 1, p);
          const height = CARD.width / card.entry.aspect + CARD.caption;
          const sx = tileX(card.from) - (CARD.width * 0.25) / 2;
          const sy = ROW_Y - (height * 0.25) / 2;
          const x = mix(sx, PANEL.x + card.slot.x, p);
          const y =
            mix(sy, PANEL.y + card.slot.y, p) - Math.sin(p * Math.PI) * 60;
          return (
            <Card
              key={card.entry.id}
              entry={card.entry}
              width={CARD.width}
              className={styles.card}
              style={{
                opacity: clamp(p * 5),
                transform: `translate(${x}px, ${y}px) scale(${scale}) rotate(${(1 - p) * card.spin}deg)`,
                filter: p < 0.9 ? `blur(${(1 - p) * 3}px)` : undefined,
              }}
            />
          );
        })}
      </div>
    </>
  );
}
