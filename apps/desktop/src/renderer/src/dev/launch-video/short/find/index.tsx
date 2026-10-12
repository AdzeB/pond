import {
  IconFolder,
  IconImageSparkle,
  IconLayers,
  IconMagnifier,
  IconTags,
  IconText,
} from "@pond/icons";
import { useRef } from "react";
import { Cursor, glide } from "../../stage/cursor";
import { cover } from "../../stage/media";
import { clamp, envelope, progress, styled, WIDTH } from "../../stage/timeline";
import { lens, track, WHOLE } from "../camera";
import { Mac } from "../mac";
import { center, useBoxes } from "../measure";
import { end, live, start } from "../timeline";
import { ALL, BROWN, CARD, FALL, place } from "./grid";
import { Picker } from "./picker";
import styles from "./styles.module.css";

const WINDOW = { x: 160, y: 90 };
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

const CHIPS = [
  { label: "Visual Match", Icon: IconImageSparkle },
  { label: "Semantic", Icon: IconText },
  { label: "Tags", Icon: IconTags },
  { label: "Folders", Icon: IconFolder },
  { label: "Shape", Icon: IconLayers },
];

/** The library: search by meaning, then narrow by color, cards gliding into place. */
export function Find({ t }: { t: number }) {
  const win = useRef<HTMLDivElement>(null);
  const chip = useRef<HTMLSpanElement>(null);
  const picker = useRef<HTMLDivElement>(null);
  const swatch = useRef<HTMLSpanElement>(null);
  const boxes = useBoxes(win, { chip, picker, swatch });
  const pop = {
    x: boxes.chip.x,
    y: boxes.chip.y + boxes.chip.height + 10,
  };
  const focus = {
    x: WINDOW.x + pop.x + boxes.picker.width / 2 - 520,
    y: WINDOW.y + pop.y + boxes.picker.height / 2 - 292,
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
  const count = t >= FILTER ? BROWN.length : t >= SEARCH ? FALL.length : 54;
  const picked = t >= PICK;
  const chipCenter = center(boxes.chip);
  const pointer = glide(t, [
    { at: S, x: chipCenter.x + 220, y: chipCenter.y + 260 },
    { at: OPEN - 60, ...chipCenter, move: 700 },
    { at: PICK - 60, ...center(boxes.swatch), move: 550 },
    {
      at: CLOSE + 500,
      x: chipCenter.x + 420,
      y: chipCenter.y + 160,
      move: 600,
    },
  ]);
  const press = (t >= OPEN && t < OPEN + 140) || (t >= PICK && t < PICK + 140);
  return (
    <div
      className={styles.stage}
      style={{
        transform: lens(view),
        visibility: live(t, "find") ? undefined : "hidden",
      }}
    >
      <Mac.Window ref={win} className={styles.library} style={styled(e)}>
        <Mac.Sidebar active="all" />
        <Mac.Panel>
          <div className={styles.header}>
            <span
              className={styles.search}
              data-typing={typed ? true : undefined}
            >
              <IconMagnifier size={20} />
              {typed ? (
                <span className={styles.query}>
                  {typed}
                  <i
                    className={styles.caret}
                    style={{
                      opacity:
                        t < SEARCH + 300 || Math.floor((t - SEARCH) / 450) % 2
                          ? 1
                          : 0,
                    }}
                  />
                </span>
              ) : (
                "Search"
              )}
            </span>
            <span className={styles.count}>{count} saves</span>
          </div>
          <div className={styles.chips}>
            <span
              ref={chip}
              className={styles.chip}
              data-open={(t >= OPEN && t < CLOSE) || undefined}
              data-on={picked || undefined}
            >
              <i
                className={styles.dot}
                style={{
                  background: picked
                    ? "#a48057"
                    : "conic-gradient(#ff5f57, #febc2e, #28c840, #0090ff, #a08bff, #ff5f57)",
                }}
              />
              Color
            </span>
            {CHIPS.map(({ label, Icon }) => (
              <span key={label} className={styles.chip}>
                <Icon size={18} />
                {label}
              </span>
            ))}
          </div>
          {place(t, STEPS).map((card) => (
            <figure
              key={card.entry.id}
              className={styles.card}
              style={{
                width: CARD.width,
                opacity: card.opacity,
                transform: `translate(${card.x}px, ${card.y}px) scale(${card.scale})`,
                visibility: card.opacity <= 0.002 ? "hidden" : undefined,
              }}
            >
              <img
                alt=""
                src={cover(card.entry.id)}
                className={styles.image}
                style={{ height: CARD.image }}
              />
              <figcaption className={styles.caption}>
                <span className={styles.name}>{card.entry.title}</span>
                <span className={styles.folder}>{card.entry.folder}</span>
              </figcaption>
            </figure>
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
          scale={(view.width / WIDTH) * (press ? 0.86 : 1)}
          opacity={
            clamp((t - OPEN + 900) / 250) * (1 - progress(t, CLOSE + 300, 300))
          }
        />
      </Mac.Window>
    </div>
  );
}
