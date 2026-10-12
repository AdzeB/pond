import { IconCircleCheckFill, IconComputer, IconLoader } from "@pond/icons";
import { cover, sample } from "../media";
import {
  clamp,
  closes,
  ease,
  envelope,
  lift,
  mix,
  opens,
  progress,
  styled,
} from "../timeline";
import styles from "./styles.module.css";

interface Beat {
  t: number;
  open?: number;
  close?: number;
}

const PICTURE = sample("Visual identity for the iFest festival in Catalonia");
const OFFSETS = [700, 1050, 1400, 1800, 2200, 2550];
const WORK = 350;
const COLORS = 3;

/** Sampled from the picture at each dot. */
const PALETTE = [
  { hex: "#A6C6DB", share: 30, x: 0.62, y: 0.08 },
  { hex: "#97ABB6", share: 22, x: 0.225, y: 0.256 },
  { hex: "#18E675", share: 18, x: 0.468, y: 0.528 },
  { hex: "#FA540C", share: 16, x: 0.454, y: 0.665 },
  { hex: "#FC86F6", share: 14, x: 0.26, y: 0.515 },
];

const ROWS = [
  { id: "caption", label: "Caption", time: "0.6s" },
  { id: "text", label: "Text in Image", time: "0.3s" },
  { id: "title", label: "Title", time: "0.2s" },
  { id: "colors", label: "Colors", time: "0.1s" },
  { id: "style", label: "Style", time: "0.1s" },
  { id: "tags", label: "Tags", time: "0.2s" },
] as const;

const STYLES = [
  { label: "Bold", score: 94 },
  { label: "Geometric", score: 88 },
  { label: "Colorful", score: 81 },
  { label: "Graphic", score: 76 },
];

const begins = (open: number, k: number) => open + (OFFSETS[k] ?? 0);
const done = (open: number, k: number) => begins(open, k) + WORK;

const appear = (t: number, at: number) =>
  styled(envelope(t, at, Number.POSITIVE_INFINITY, { duration: 400, rise: 6 }));

function Stream({ t, text, at }: { t: number; text: string; at: number }) {
  return text.split(" ").map((word, index) => (
    <span
      // biome-ignore lint/suspicious/noArrayIndexKey: words are static per value
      key={`${index}-${word}`}
      className={styles.word}
      style={styled(
        envelope(t, at + index * 30, Number.POSITIVE_INFINITY, {
          duration: 500,
          rise: 6,
        }),
      )}
    >
      {word}
    </span>
  ));
}

function Value({ t, k, open }: { t: number; k: number; open: number }) {
  const at = done(open, k);
  const id = ROWS[k]?.id;
  if (id === "caption")
    return (
      <p className={styles.caption}>
        <Stream t={t} at={at} text={PICTURE.caption} />
      </p>
    );
  if (id === "text")
    return (
      <p className={styles.text}>
        <Stream
          t={t}
          at={at}
          text="Festival de Emprenedoria, Innovació. Get inspired, be disruptive. ifest.cat"
        />
      </p>
    );
  if (id === "title")
    return (
      <p className={styles.title}>
        <Stream t={t} at={at} text={PICTURE.title} />
      </p>
    );
  if (id === "colors")
    return (
      <div className={styles.palette}>
        {PALETTE.map((color, index) => {
          const e = envelope(t, at + index * 50, Number.POSITIVE_INFINITY, {
            duration: 500,
            rise: 0,
          });
          return (
            <span
              key={color.hex}
              className={styles.swatch}
              style={{ flexGrow: color.share * mix(0.2, 1, e.opacity) }}
            >
              <span
                className={styles.chip}
                style={{ background: color.hex, opacity: e.opacity }}
              />
              <span className={styles.hex} style={styled(e)}>
                {color.hex}
              </span>
            </span>
          );
        })}
      </div>
    );
  if (id === "style")
    return (
      <div className={styles.styles}>
        {STYLES.map((style, index) => {
          const e = envelope(t, at + index * 60, Number.POSITIVE_INFINITY, {
            duration: 500,
            rise: 8,
          });
          const fill = ease.outQuint(progress(t, at + index * 60, 700));
          return (
            <span key={style.label} className={styles.style} style={styled(e)}>
              <span className={styles.meter}>
                <span
                  className={styles.level}
                  style={{ width: `${style.score * fill}%` }}
                />
              </span>
              {style.label}
              <span className={styles.score}>{style.score}%</span>
            </span>
          );
        })}
      </div>
    );
  return (
    <div className={styles.tags}>
      {["billboard", "festival", "branding", "typography", "street"].map(
        (tag, index) => (
          <span
            key={tag}
            className={styles.tag}
            style={styled(
              envelope(t, at + index * 60, Number.POSITIVE_INFINITY, {
                duration: 500,
                rise: 8,
              }),
            )}
          >
            {tag}
          </span>
        ),
      )}
    </div>
  );
}

/** One picture read on-device: caption, text, title, colors, style, and tags fill in beside it. */
export function Enrich({
  t,
  open = opens("enrich"),
  close = closes("enrich"),
}: Beat) {
  const image = lift(t, open, close);
  if (image.opacity <= 0) return null;
  const card = lift(t, open + 120, close);
  const scan = progress(t, open + 500, 1500);
  return (
    <>
      <figure
        className={styles.picture}
        style={styled({
          opacity: image.opacity,
          dy: image.dy,
          blur: image.blur,
        })}
      >
        <img alt="" src={cover(PICTURE.id)} className={styles.image} />
        {scan > 0 && scan < 1 ? (
          <span
            className={styles.scan}
            style={{
              top: `${scan * 100}%`,
              opacity: Math.sin(scan * Math.PI),
            }}
          />
        ) : null}
        {PALETTE.map((color, index) => {
          const pop = ease.outQuint(
            progress(t, done(open, COLORS) + index * 70, 450),
          );
          return (
            <span
              key={color.hex}
              className={styles.dot}
              style={{
                left: `${color.x * 100}%`,
                top: `${color.y * 100}%`,
                background: color.hex,
                opacity: clamp(pop * 2),
                transform: `translate(-50%, -50%) scale(${mix(0.3, 1, pop)})`,
              }}
            />
          );
        })}
      </figure>
      <section
        className={styles.card}
        style={styled({ opacity: card.opacity, dy: card.dy, blur: card.blur })}
      >
        <header className={styles.header}>
          <img alt="" src={cover(PICTURE.id)} className={styles.thumb} />
          <span className={styles.file}>
            <span className={styles.name}>ifest-billboard.jpg</span>
            <span className={styles.kind}>JPEG image · 1080×1080</span>
          </span>
          <span className={styles.device}>
            <IconComputer size={12} />
            On-device
          </span>
        </header>
        <div className={styles.rows}>
          {ROWS.map((row, k) => {
            const start = begins(open, k);
            const state =
              t >= done(open, k) ? "done" : t >= start ? "working" : "pending";
            return (
              <div
                key={row.label}
                className={styles.row}
                data-state={state}
                style={appear(t, start - 120)}
              >
                <span className={styles.label}>
                  {state === "done" ? (
                    <IconCircleCheckFill size={14} className={styles.check} />
                  ) : state === "working" ? (
                    <IconLoader
                      size={14}
                      className={styles.spinner}
                      style={{ transform: `rotate(${(t - start) * 0.6}deg)` }}
                    />
                  ) : (
                    <span className={styles.pending} />
                  )}
                  {row.label}
                  <span className={styles.time}>
                    {state === "done" ? row.time : ""}
                  </span>
                </span>
                <Value t={t} k={k} open={open} />
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}
