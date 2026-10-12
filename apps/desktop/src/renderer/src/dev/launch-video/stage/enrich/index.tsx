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

const PICTURE = sample("Visual identity for the iFest festival in Catalonia");
const OPEN = opens("enrich");
const CLOSE = closes("enrich");
const STARTS = [780, 1180, 1980, 2430].map((ms) => OPEN + ms);
const WORK = 350;

/** Sampled from the picture at each dot. */
const PALETTE = [
  { hex: "#A6C6DB", share: 30, x: 0.62, y: 0.08 },
  { hex: "#97ABB6", share: 22, x: 0.225, y: 0.256 },
  { hex: "#18E675", share: 18, x: 0.468, y: 0.528 },
  { hex: "#FA540C", share: 16, x: 0.454, y: 0.665 },
  { hex: "#FC86F6", share: 14, x: 0.26, y: 0.515 },
];

const ROWS = [
  { label: "Caption", time: "0.6s" },
  { label: "Text in Image", time: "0.3s" },
  { label: "Colors", time: "0.1s" },
  { label: "Tags", time: "0.2s" },
] as const;

const begins = (k: number) => STARTS[k] ?? OPEN;
const done = (k: number) => begins(k) + WORK;

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

function Value({ t, k }: { t: number; k: number }) {
  const at = done(k);
  if (k === 0)
    return (
      <p className={styles.caption}>
        <Stream t={t} at={at} text={PICTURE.caption} />
      </p>
    );
  if (k === 1)
    return (
      <p className={styles.text}>
        <Stream
          t={t}
          at={at}
          text="Festival de Emprenedoria, Innovació. Get inspired, be disruptive. ifest.cat"
        />
      </p>
    );
  if (k === 2)
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

/** One picture read on-device: caption, text, colors, and tags fill in beside it. */
export function Enrich({ t }: { t: number }) {
  const image = lift(t, OPEN, CLOSE);
  if (image.opacity <= 0) return null;
  const card = lift(t, OPEN + 120, CLOSE);
  const scan = progress(t, OPEN + 500, 1500);
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
          const pop = ease.outQuint(progress(t, done(2) + index * 70, 450));
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
            const start = begins(k);
            const state =
              t >= done(k) ? "done" : t >= start ? "working" : "pending";
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
                <Value t={t} k={k} />
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}
