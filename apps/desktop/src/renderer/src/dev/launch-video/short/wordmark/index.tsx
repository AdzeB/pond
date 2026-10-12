import { Logo } from "@pond/ui/logo";
import { useRef } from "react";
import { useLayout } from "../../stage/layout";
import { clamp, ease, mix, progress } from "../../stage/timeline";
import styles from "./styles.module.css";

const DOTS = [0, 1, 2, 3, 4, 5, 6, 7];
const GAP = 22;

interface WordmarkProps {
  t: number;
  /** When the mark lands. */
  enter: number;
  /** When the name starts sliding back behind the mark. */
  retract?: number;
  /** When the mark itself leaves. */
  exit?: number;
  /** Spin a loader in before the mark lands. */
  spin?: boolean;
  y?: number;
}

/** The Pond mark landing, with its name sliding out from behind it. */
export function Wordmark({
  t,
  enter,
  retract = Number.POSITIVE_INFINITY,
  exit = Number.POSITIVE_INFINITY,
  spin = false,
  y = 540,
}: WordmarkProps) {
  const name = useRef<HTMLSpanElement>(null);
  const width = useLayout(() => name.current?.offsetWidth ?? 0, 0);
  const from = spin ? enter - 800 : enter;
  const hidden = t < from || t > exit + 400;
  const land = ease.outQuint(progress(t, enter, 650));
  const open =
    ease.inOut(progress(t, enter + 450, 500)) *
    (1 - ease.inOut(progress(t, retract, 380)));
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
      {spin && !hidden ? <Spinner t={t} enter={enter} /> : null}
      <span
        className={styles.mark}
        style={{
          opacity: clamp(land * 2),
          transform: `translateX(${-shift * open}px) scale(${mix(0.4, 1, land) * (1 - out * 0.2)})`,
        }}
      >
        <Logo size={84} aria-hidden />
      </span>
      <span
        className={styles.clip}
        style={{
          left: `calc(50% + ${42 + GAP - shift * open}px)`,
          width: width * open,
        }}
      >
        <span
          ref={name}
          className={styles.name}
          style={{ transform: `translateX(${(open - 1) * 40}px)` }}
        >
          Pond
        </span>
      </span>
    </div>
  );
}

/** A ring of dashes turning, then drawing into the mark. */
function Spinner({ t, enter }: { t: number; enter: number }) {
  const gather = ease.in(progress(t, enter - 150, 300));
  if (gather >= 1) return null;
  const turn = ((t - enter) / 900) * 360;
  return (
    <span
      className={styles.spinner}
      style={{ transform: `rotate(${turn}deg)` }}
    >
      {DOTS.map((i) => (
        <i
          key={i}
          style={{
            opacity: (0.25 + (0.75 * i) / (DOTS.length - 1)) * (1 - gather),
            transform: `rotate(${(i * 360) / DOTS.length}deg) translateY(${mix(-40, -6, gather)}px)`,
          }}
        />
      ))}
    </span>
  );
}
