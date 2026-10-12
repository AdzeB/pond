import { IconMagnifier } from "@pond/icons";
import { IconApple } from "@pond/icons/social-media";
import { clamp, envelope, styled } from "../../stage/timeline";
import { start } from "../timeline";
import { Wordmark } from "../wordmark";
import styles from "./styles.module.css";

const ADDRESS = "pond.app";
const HIT = start("outro");
const FIELD = HIT + 900;
const TYPE = FIELD + 350;
const STEP = 70;
const TYPED = TYPE + (ADDRESS.length - 1) * STEP;
const HOLD = Number.POSITIVE_INFINITY;

/** The wordmark on the hit, the address typed into a search field, and the download. */
export function Outro({ t }: { t: number }) {
  const field = envelope(t, FIELD, HOLD, { rise: 18 });
  const button = envelope(t, TYPED + 300, HOLD, { rise: 18 });
  const count = clamp(Math.floor((t - TYPE) / STEP) + 1, 0, ADDRESS.length);
  const blink = t < TYPED + 200 || Math.floor((t - TYPED) / 450) % 2 === 1;
  return (
    <>
      <Wordmark t={t} enter={HIT} y={400} />
      {t >= FIELD ? (
        <>
          <span className={styles.field} style={styled(field)}>
            <IconMagnifier size={32} className={styles.icon} />
            <span className={styles.text}>
              {ADDRESS.slice(0, count)}
              <i
                className={styles.caret}
                style={{ opacity: blink && t >= TYPE - 100 ? 1 : 0 }}
              />
            </span>
          </span>
          <span className={styles.button} style={styled(button)}>
            <IconApple className={styles.apple} />
            Download for Mac
          </span>
        </>
      ) : null}
    </>
  );
}
