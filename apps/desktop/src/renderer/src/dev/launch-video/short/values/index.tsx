import { Fragment } from "react";
import { ease, envelope, mix, progress, styled } from "../../stage/timeline";
import { Glow } from "../glow";
import { end, start } from "../timeline";
import styles from "./styles.module.css";

const VALUES = ["Local-first", "On-device", "Free and open source"];
const SWEEP = start("values") + 250;
const BEAT = 500;

/** What Pond stands on, lit one at a time on the beat. */
export function Values({ t }: { t: number }) {
  if (t < start("values") || t > end("values") + 50) return null;
  const e = envelope(t, start("values"), end("values") - 350, { rise: 14 });
  return (
    <p className={styles.row} style={styled(e)}>
      {VALUES.map((value, i) => {
        const on = ease.out(progress(t, SWEEP + i * BEAT, 260));
        const off =
          i < VALUES.length - 1
            ? ease.out(progress(t, SWEEP + (i + 1) * BEAT, 260))
            : 0;
        const lit = on * (1 - off);
        return (
          <Fragment key={value}>
            {i > 0 ? <span className={styles.bar}>|</span> : null}
            <span style={{ opacity: mix(0.32, 1, Math.max(lit, off)) }}>
              <Glow amount={lit}>{value}</Glow>
            </span>
          </Fragment>
        );
      })}
    </p>
  );
}
