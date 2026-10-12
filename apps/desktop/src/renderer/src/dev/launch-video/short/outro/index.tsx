import { IconMagnifier } from "@pond/icons";
import { IconApple } from "@pond/icons/social-media";
import { Logo } from "@pond/ui/logo";
import {
  clamp,
  ease,
  envelope,
  mix,
  progress,
  styled,
} from "../../stage/timeline";
import { Glow } from "../glow";
import { start } from "../timeline";
import styles from "./styles.module.css";

const ADDRESS = "pond.app";
const HIT = start("outro");
const TYPE = HIT + 380;
const STEP = 60;
const TYPED = TYPE + (ADDRESS.length - 1) * STEP;
const HOLD = Number.POSITIVE_INFINITY;

/** The mark on the hit, the address typed into a search field, and the download. */
export function Outro({ t }: { t: number }) {
  if (t < HIT - 50) return null;
  const mark = ease.outQuint(progress(t, HIT, 650));
  const field = envelope(t, HIT + 150, HOLD, { rise: 18 });
  const button = envelope(t, TYPED + 250, HOLD, { rise: 18 });
  const count = clamp(Math.floor((t - TYPE) / STEP) + 1, 0, ADDRESS.length);
  const glow = ease.out(progress(t, TYPED + 150, 450));
  const blink = t < TYPED + 200 || Math.floor((t - TYPED) / 400) % 2 === 1;
  return (
    <>
      <span
        className={styles.mark}
        style={{
          opacity: clamp(mark * 2),
          transform: `translate(-50%, -50%) scale(${mix(0.55, 1, mark)})`,
          filter: mark < 0.98 ? `blur(${(1 - mark) * 10}px)` : undefined,
        }}
      >
        <Logo size={96} aria-hidden />
      </span>
      <span className={styles.field} style={styled(field)}>
        <IconMagnifier size={30} className={styles.icon} />
        <span className={styles.text}>
          <Glow amount={glow}>{ADDRESS.slice(0, count)}</Glow>
          <i className={styles.caret} style={{ opacity: blink ? 1 : 0 }} />
        </span>
      </span>
      <span className={styles.button} style={styled(button)}>
        <IconApple className={styles.apple} />
        Download for Mac
      </span>
    </>
  );
}
