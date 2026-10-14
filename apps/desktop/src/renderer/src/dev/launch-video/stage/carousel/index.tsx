import { Logo } from "@pond/ui/logo";
import { useRef } from "react";
import { useLayout } from "../layout";
import { Words } from "../line";
import { clamp, ease, envelope, mix, progress, styled } from "../timeline";
import styles from "./styles.module.css";

const ITEMS = [
  "Save",
  "Sync",
  "Own",
  "Enrich",
  "Find",
  "Ask",
  "Connect",
  "Pond",
];
const CADENCE = 270;
const MOVE = 200;

interface CarouselProps {
  t: number;
  enter: number;
  exit: number;
  sub: string;
}

/** Every verb slides past the centre in turn and the reel rests on Pond, with the line beneath. */
export function Carousel({ t, enter, exit, sub }: CarouselProps) {
  const row = useRef<HTMLDivElement>(null);
  const centres = useLayout(
    () =>
      [...(row.current?.children ?? [])].map((child) => {
        const element = child as HTMLElement;
        return element.offsetLeft + element.offsetWidth / 2;
      }),
    [] as number[],
  );
  const u = t - enter;
  let focus = 0;
  for (let k = 1; k < ITEMS.length; k++) {
    focus += ease.inOut(progress(u, k * CADENCE - MOVE, MOVE));
  }
  const at = (k: number) => centres[k] ?? 0;
  const base = Math.floor(focus);
  const centre = mix(at(base), at(base + 1), focus - base);
  const e = envelope(t, enter, exit, { duration: 500, rise: 0, out: 400 });
  return (
    <>
      <div
        ref={row}
        className={styles.row}
        style={{
          ...styled(e),
          transform: `translateX(${960 - centre}px)`,
        }}
      >
        {ITEMS.map((item, k) => {
          const d = Math.abs(k - focus);
          const last = k === ITEMS.length - 1;
          return (
            <span
              key={item}
              className={styles.item}
              style={{
                opacity: clamp(1 - d * 0.42, 0.06, 1),
                filter:
                  d > 0.05 ? `blur(${Math.min(d, 2.5) * 2.4}px)` : undefined,
                transform: `scale(${mix(1, 0.82, clamp(d))})`,
              }}
            >
              {last ? <Logo size={58} aria-hidden /> : null}
              {item}
            </span>
          );
        })}
      </div>
      <div
        className={styles.sub}
        style={{
          visibility: t < enter || t > exit + 800 ? "hidden" : undefined,
        }}
      >
        <Words t={t} text={sub} enter={enter + 500} exit={exit} stagger={45} />
      </div>
    </>
  );
}
