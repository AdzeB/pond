import { type CSSProperties, useRef } from "react";
import { useLayout } from "../layout";
import { Words } from "../line";
import { ease, HEAD_Y, mix, progress } from "../timeline";
import styles from "./styles.module.css";

export type Effect = "flip" | "drop" | "scramble" | "type" | "smear";

const HERO = 2;
const DOCK = 650;
const INK = [23, 23, 23];
const ACCENT = [0, 143, 255];
const GLYPHS = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#%&";

const hash = (x: number, y: number) => {
  const v = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return v - Math.floor(v);
};

const tint = (amount: number) =>
  `rgb(${ACCENT.map((v, i) => Math.round(mix(v, INK[i] ?? 0, amount))).join(",")})`;

interface Glyph {
  opacity: number;
  transform?: string;
  blur?: number;
  text?: string;
  settle: number;
}

/** One letter's reveal; `u` is milliseconds since the beat started. */
function letter(fx: Effect, u: number, i: number, c: string): Glyph {
  if (fx === "flip") {
    const s = ease.out(progress(u, i * 40, 550));
    return {
      opacity: s,
      transform: `perspective(600px) rotateX(${(1 - s) * -95}deg)`,
      settle: i * 40 + 550,
    };
  }
  if (fx === "drop") {
    const s = ease.outQuint(progress(u, i * 35, 650));
    return {
      opacity: s,
      transform: `translateY(${(1 - s) * -26}px)`,
      blur: (1 - s) * 5,
      settle: i * 35 + 450,
    };
  }
  if (fx === "scramble") {
    const settle = 300 + i * 65;
    const glyph =
      GLYPHS[Math.floor(hash(i, Math.floor(u / 55)) * GLYPHS.length)] ?? c;
    return {
      opacity: progress(u, i * 20, 100),
      text: u < settle && c !== " " ? glyph : c,
      settle,
    };
  }
  if (fx === "type") return { opacity: u >= i * 85 ? 1 : 0, settle: i * 85 };
  const s = ease.outQuint(progress(u, i * 25, 600));
  return {
    opacity: s,
    transform: `translateX(${(1 - s) * -50}px) scaleX(${1 + (1 - s) * 2.4})`,
    blur: (1 - s) * 12,
    settle: i * 25 + 350,
  };
}

interface VerbProps {
  t: number;
  verb: string;
  sub: string;
  fx: Effect;
  enter: number;
  exit: number;
  /** Milliseconds the verb holds at center before docking; omit to reveal in place. */
  hero?: number;
  y?: number;
  out?: number;
}

/** A product beat's headline: the verb lands, docks into the line, then its sentence follows. */
export function Verb({
  t,
  verb,
  sub,
  fx,
  enter,
  exit,
  hero,
  y = HEAD_Y,
  out = 350,
}: VerbProps) {
  const group = useRef<HTMLSpanElement>(null);
  const dx = useLayout(() => {
    const element = group.current;
    return element ? 960 - (element.offsetLeft + element.offsetWidth / 2) : 0;
  }, 0);
  const gone = ease.in(progress(t, exit, out));
  const live = t >= enter - 50 && gone < 1;
  const u = t - enter;
  const dock = hero === undefined ? null : enter + hero;
  const p = dock === null ? 1 : ease.inOut(progress(t, dock, DOCK));
  const subEnter = dock === null ? enter + 350 : dock + DOCK * 0.55;
  const chars = [...verb];
  const typed = chars.filter((_, i) => u >= i * 85).length;
  const typing = u < chars.length * 85 + 100;
  const caret =
    fx === "type" &&
    u >= -50 &&
    (dock === null || t < dock + DOCK) &&
    (typing || Math.floor(u / 400) % 2 === 0);
  const groupStyle: CSSProperties = {
    opacity: 1 - gone,
    transform: `translate(${mix(dx, 0, p)}px, ${mix(540 - y, 0, p) - gone * 10}px) scale(${mix(HERO, 1, p)})`,
    filter: gone > 0.01 ? `blur(${gone * 8}px)` : undefined,
  };
  return (
    <div
      className={styles.line}
      style={{ top: y, visibility: live ? undefined : "hidden" }}
    >
      <span ref={group} className={styles.verb} style={groupStyle}>
        {chars.map((c, i) => {
          const g = letter(fx, u, i, c);
          return (
            // biome-ignore lint/suspicious/noArrayIndexKey: letters are static per verb
            <span key={i} className={styles.glyph}>
              <span
                className={styles.char}
                style={{
                  opacity: g.opacity,
                  transform: g.transform,
                  filter:
                    g.blur && g.blur > 0.05 ? `blur(${g.blur}px)` : undefined,
                  color: tint(ease.out(progress(u, g.settle, 500))),
                }}
              >
                {g.text ?? c}
              </span>
              {caret && i === Math.max(0, typed - 1) ? (
                <span className={styles.caret} />
              ) : null}
            </span>
          );
        })}
      </span>
      <Words t={t} text={sub} enter={subEnter} exit={exit} out={out} />
    </div>
  );
}
