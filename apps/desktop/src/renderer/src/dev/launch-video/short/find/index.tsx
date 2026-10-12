import { useRef } from "react";
import { Cursor, glide } from "../../stage/cursor";
import { clamp, envelope, progress, styled, WIDTH } from "../../stage/timeline";
import { lens, track, WHOLE } from "../camera";
import { Card } from "../card";
import { Mac, ZOOM } from "../mac";
import { center, useBoxes } from "../measure";
import { end, live, start } from "../timeline";
import { Toolbar } from "../toolbar";
import { ALL, BROWN, CARD, FALL, place } from "./grid";
import { Picker } from "./picker";
import styles from "./styles.module.css";

const WINDOW = { x: 160, y: 77 };
const QUERY = "fall outfits";
const S = start("find");
const TYPE = S + 400;
const STEP = 50;
const SEARCH = TYPE + QUERY.length * STEP + 100;
const OPEN = S + 2000;
const PICK = S + 2850;
const CLOSE = PICK + 350;
const FILTER = CLOSE + 100;
const EXIT = end("find") - 300;

const STEPS = [
  { at: S, list: ALL },
  { at: SEARCH, list: FALL },
  { at: FILTER, list: BROWN },
];

/** The library: search by meaning, then narrow by color, cards gliding into place. */
export function Find({ t }: { t: number }) {
  const app = useRef<HTMLDivElement>(null);
  const chip = useRef<HTMLSpanElement>(null);
  const picker = useRef<HTMLDivElement>(null);
  const swatch = useRef<HTMLSpanElement>(null);
  const boxes = useBoxes(app, { chip, picker, swatch });
  const pop = { x: boxes.chip.x - 2, y: boxes.chip.y + boxes.chip.height + 6 };
  const focus = {
    x: WINDOW.x + (pop.x + boxes.picker.width / 2) * ZOOM - 520,
    y: WINDOW.y + (pop.y + boxes.picker.height / 2) * ZOOM - 330,
    width: 1040,
  };
  const view = track(t, [
    { at: S, ...WHOLE },
    { at: OPEN, ...WHOLE, move: 1 },
    { at: OPEN + 650, ...focus, move: 650 },
    { at: CLOSE, ...focus, move: 1 },
    { at: CLOSE + 600, ...WHOLE, move: 600 },
  ]);
  const e = envelope(t, S, EXIT, { rise: 40, duration: 900 });
  const typed = QUERY.slice(
    0,
    clamp(Math.floor((t - TYPE) / STEP) + 1, 0, QUERY.length),
  );
  const picked = t >= PICK;
  const chipCenter = center(boxes.chip);
  const pointer = glide(t, [
    { at: S, x: chipCenter.x + 180, y: chipCenter.y + 200 },
    { at: OPEN - 60, ...chipCenter, move: 700 },
    { at: PICK - 60, ...center(boxes.swatch), move: 550 },
    {
      at: CLOSE + 500,
      x: chipCenter.x + 330,
      y: chipCenter.y + 130,
      move: 600,
    },
  ]);
  const press = (t >= OPEN && t < OPEN + 140) || (t >= PICK && t < PICK + 140);
  const blink = t < SEARCH + 300 || Math.floor((t - SEARCH) / 450) % 2 === 1;
  return (
    <div
      className={styles.stage}
      style={{
        transform: lens(view),
        visibility: live(t, "find") ? undefined : "hidden",
      }}
    >
      <Mac.Window
        ref={app}
        place="all"
        className={styles.library}
        style={styled(e)}
      >
        <Mac.Panel>
          <Toolbar
            query={typed}
            caret={blink}
            chip={chip}
            open={t >= OPEN && t < CLOSE}
            picked={picked}
          />
          {place(t, STEPS).map((card) => (
            <Card
              key={card.entry.id}
              entry={card.entry}
              width={CARD.width}
              className={styles.card}
              style={{
                opacity: card.opacity,
                transform: `translate(${card.x}px, ${card.y}px) scale(${card.scale})`,
                visibility: card.opacity <= 0.002 ? "hidden" : undefined,
              }}
            />
          ))}
        </Mac.Panel>
        <Picker
          ref={picker}
          swatch={swatch}
          t={t}
          open={OPEN + 40}
          pick={PICK}
          close={CLOSE}
          left={pop.x}
          top={pop.y}
        />
        <Cursor
          x={pointer.x}
          y={pointer.y}
          scale={(view.width / WIDTH / ZOOM) * (press ? 0.86 : 1)}
          opacity={
            clamp((t - OPEN + 900) / 250) * (1 - progress(t, CLOSE + 300, 300))
          }
        />
      </Mac.Window>
    </div>
  );
}
