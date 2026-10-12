import { useRef } from "react";
import { BRANDS } from "../brands";
import { useLayout } from "../layout";
import {
  BEATS,
  clamp,
  ease,
  envelope,
  mix,
  progress,
  styled,
} from "../timeline";
import styles from "./styles.module.css";

const ENTER = BEATS.ticker[0];
const FIRST = ENTER + 260;
const STEP = 296;
const LAST = FIRST + BRANDS.length * STEP + 130;
const EXIT = BEATS.ticker[1] - 350;
const ROW = 96;

const ITEMS = [
  ...BRANDS.map((entry, k) => ({ ...entry, at: FIRST + k * STEP })),
  { id: "anywhere", name: "anywhere.", Icon: null, at: LAST },
];

/** "Save from" with each source rolling through a slot, landing on "anywhere." */
export function Ticker({ t }: { t: number }) {
  const lead = useRef<HTMLSpanElement>(null);
  const first = useRef<HTMLSpanElement>(null);
  const last = useRef<HTMLSpanElement>(null);
  const size = useLayout(
    () => ({
      lead: lead.current?.offsetWidth ?? 0,
      first: first.current?.offsetWidth ?? 0,
      last: last.current?.offsetWidth ?? 0,
    }),
    { lead: 0, first: 0, last: 0 },
  );
  const live = t >= ENTER - 50 && t <= EXIT + 400;
  const e = envelope(t, ENTER, EXIT, { duration: 600, rise: 14 });
  const start = 960 - (size.lead + 22 + size.first) / 2;
  const end = 960 - (size.lead + 17 + size.last) / 2;
  const x = mix(start, end, ease.inOut(progress(t, LAST - 100, 600)));
  const settle = ease.out(progress(t, LAST, 400));
  const out = ease.in(progress(t, EXIT, 350));
  let f = 0;
  for (let k = 1; k < ITEMS.length; k++) {
    f += ease.inOut(progress(t, (ITEMS[k]?.at ?? 0) - 260, 260));
  }
  return (
    <div
      className={styles.ticker}
      style={{ visibility: live ? undefined : "hidden" }}
    >
      <span
        ref={lead}
        className={styles.lead}
        style={styled(e, `translate(${x}px, 540px) translateY(-50%)`)}
      >
        Save from
      </span>
      {ITEMS.map((item, k) => {
        const d = k - f;
        const born = envelope(t, item.at - 280, Number.POSITIVE_INFINITY, {
          duration: 450,
          rise: 0,
        }).opacity;
        const opacity =
          (d >= 0 ? clamp(1 - d) : clamp(1 + d * 0.62) * (1 - settle)) *
          born *
          (1 - out);
        const left = x + size.lead + (item.Icon ? 22 : 17);
        const blur = Math.abs(d) * 3 + out * 8;
        return (
          <span
            key={item.id}
            ref={k === 0 ? first : item.Icon ? undefined : last}
            className={styles.item}
            style={{
              opacity,
              transform: `translate(${left}px, ${540 + d * ROW + e.dy}px) translateY(-50%)`,
              filter: blur > 0.05 ? `blur(${blur}px)` : undefined,
              visibility: opacity <= 0.002 ? "hidden" : undefined,
            }}
          >
            {item.Icon ? <item.Icon className={styles.logo} /> : null}
            <span>{item.name}</span>
          </span>
        );
      })}
    </div>
  );
}
