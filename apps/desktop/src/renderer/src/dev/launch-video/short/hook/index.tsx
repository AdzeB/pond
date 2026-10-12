import { clamp, ease, mix, progress } from "../../stage/timeline";
import { Glow } from "../glow";
import { end, start } from "../timeline";
import styles from "./styles.module.css";

const LEAD = "Introducing ";
const NAME = "Pond";
const TYPE = start("hook") + 250;
const STEP = 55;
const TYPED = TYPE + (LEAD.length + NAME.length - 1) * STEP;
const EXIT = end("hook") - 300;

/** A single input typing the product's name, the way an assistant prompt would. */
export function Hook({ t }: { t: number }) {
  if (t > end("hook") + 50) return null;
  const count = clamp(Math.floor((t - TYPE) / STEP) + 1, 0, 99);
  const lead = LEAD.slice(0, count);
  const name = NAME.slice(0, Math.max(0, count - LEAD.length));
  const enter = ease.outQuint(progress(t, start("hook"), 450));
  const out = ease.in(progress(t, EXIT, 300));
  const glow = ease.out(progress(t, TYPED + 120, 420));
  const blink = t < TYPED + 200 || Math.floor((t - TYPED) / 400) % 2 === 1;
  return (
    <div
      className={styles.field}
      style={{
        opacity: enter * (1 - out),
        transform: `translate(-50%, -50%) scale(${mix(0.96, 1, enter) - out * 0.03})`,
        filter: out > 0.01 ? `blur(${out * 10}px)` : undefined,
      }}
    >
      <span
        className={styles.text}
        style={{ transform: `translateX(${-out * 60}px)` }}
      >
        {lead}
        {name ? <Glow amount={glow}>{name}</Glow> : null}
        <i className={styles.caret} style={{ opacity: blink ? 1 : 0 }} />
      </span>
    </div>
  );
}
