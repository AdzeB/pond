import { cover, PORSCHE } from "../media";
import { BEATS, clamp, ease, presence, progress } from "../timeline";
import styles from "./styles.module.css";

const PROMPT = "Find my green Porsche in Pond";
const ANSWER = "It's in Cars. You saved it from Pinterest on Oct 9.";

/** An agent in a terminal calling Pond's MCP server. */
export function Terminal({ t }: { t: number }) {
  const opacity = presence(t, "connect", 420, 320);
  if (opacity <= 0) return null;
  const start = BEATS.connect[0];
  const rise = ease.out(progress(t, start + 500, 700));
  const typed = clamp(Math.floor((t - start - 1100) / 32), 0, PROMPT.length);
  const show = (offset: number) => ease.out(progress(t, start + offset, 300));
  const words = ANSWER.split(" ");
  const said = clamp(Math.floor((t - start - 3300) / 50) + 1, 0, words.length);
  return (
    <div
      className={styles.terminal}
      style={{
        opacity: opacity * clamp(rise * 1.4),
        transform: `translateY(${(1 - rise) * 40}px)`,
      }}
    >
      <header className={styles.bar}>
        <span className={styles.lights}>
          <i />
          <i />
          <i />
        </span>
        <span className={styles.title}>claude</span>
      </header>
      <div className={styles.body}>
        <p className={styles.prompt}>
          <span className={styles.caret}>›</span>
          {PROMPT.slice(0, typed)}
          {typed < PROMPT.length ? <span className={styles.block} /> : null}
        </p>
        <div className={styles.step} style={{ opacity: show(2300) }}>
          <p>
            <span className={styles.dot}>●</span>
            <span className={styles.tool}>pond · search_saves</span>
            <span className={styles.args}>(query: "green porsche")</span>
          </p>
          <div className={styles.result} style={{ opacity: show(2800) }}>
            <span className={styles.branch}>⎿</span>
            <img alt="" src={cover(PORSCHE)} className={styles.thumb} />
            <span className={styles.hit}>
              <span>Vintage green Porsche</span>
              <span className={styles.args}>Cars · Pinterest</span>
            </span>
          </div>
        </div>
        {said > 0 ? (
          <p className={styles.answer}>
            <span className={styles.dot} data-tone="answer">
              ●
            </span>
            {words.slice(0, said).join(" ")}
          </p>
        ) : null}
      </div>
    </div>
  );
}
