import { useRef } from "react";
import { useLayout } from "../../stage/layout";
import { clamp, ease, mix, progress } from "../../stage/timeline";
import { Morph } from "../morph";
import styles from "./styles.module.css";

const SIZE = 96;
const GAP = 24;
const SPIN = 900;

interface WordmarkProps {
  t: number;
  /** When the ring finishes morphing into the mark. */
  enter: number;
  /** When the name fades back out. */
  retract?: number;
  /** When the mark itself leaves. */
  exit?: number;
  y?: number;
}

/** Pond's loader resolving into the mark, then its name fading in beside it. */
export function Wordmark({
  t,
  enter,
  retract = Number.POSITIVE_INFINITY,
  exit = Number.POSITIVE_INFINITY,
  y = 540,
}: WordmarkProps) {
  const name = useRef<HTMLSpanElement>(null);
  const width = useLayout(() => name.current?.offsetWidth ?? 0, 0);
  const from = enter - 1100;
  const hidden = t < from || t > exit + 400;
  const open =
    ease.inOut(progress(t, enter + 150, 650)) *
    (1 - ease.inOut(progress(t, retract, 450)));
  const fade =
    ease.out(progress(t, enter + 250, 550)) *
    (1 - ease.in(progress(t, retract, 300)));
  const out = ease.in(progress(t, exit, 300));
  const shift = (width + GAP) / 2;
  return (
    <div
      className={styles.wordmark}
      style={{
        top: y,
        opacity: 1 - out,
        filter: out > 0.01 ? `blur(${out * 8}px)` : undefined,
        visibility: hidden ? "hidden" : undefined,
      }}
    >
      <span
        className={styles.mark}
        style={{
          transform: `translateX(${-shift * open}px) scale(${1 - out * 0.15})`,
        }}
      >
        <Loader t={t} enter={enter} />
      </span>
      <span
        ref={name}
        className={styles.name}
        style={{
          left: `calc(50% + ${SIZE / 2 + GAP - shift * open}px)`,
          opacity: fade,
          filter: fade < 0.99 ? `blur(${(1 - fade) * 10}px)` : undefined,
          transform: `translateX(${(1 - fade) * -12}px)`,
        }}
      >
        Pond
      </span>
    </div>
  );
}

/** Pond's loader: a spinning arc that closes into a ring, which morphs into the mark. */
function Loader({ t, enter }: { t: number; enter: number }) {
  const appear = ease.outQuint(progress(t, enter - 1100, 400));
  const close = ease.inOut(progress(t, enter - 620, 300));
  const morph = ease.inOut(progress(t, enter - 330, 330));
  const bump = Math.sin(progress(t, enter, 260) * Math.PI) * 0.06;
  return (
    <Morph
      size={SIZE}
      mark={morph}
      close={close}
      turn={((t - enter) / SPIN) * 360 * (1 - close)}
      style={{
        opacity: clamp(appear * 1.5),
        transform: `scale(${mix(0.7, 1, appear) + bump})`,
      }}
    />
  );
}
