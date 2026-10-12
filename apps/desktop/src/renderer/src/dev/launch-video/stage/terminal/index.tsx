import { IconAnthropic } from "@pond/icons/social-media";
import { brand } from "../brands";
import { cover, sample } from "../media";
import { clamp, closes, envelope, lift, opens, styled } from "../timeline";
import styles from "./styles.module.css";

const PROMPT = "Pull knitwear references from Pond for the lookbook";
const ANSWER =
  "Four knits from your library: two rolled-edge sweaters, a pink dip-dye knit, and a red turtleneck.";
const HITS = [
  "Green rolled-edge sweater",
  "Rolled-edge wool sweater",
  "Pink dip-dye knit",
  "Red turtleneck",
].map(sample);

const OPEN = opens("connect");
const CLOSE = closes("connect");
const TYPE = OPEN + 300;
const CALL = OPEN + 1700;
const FOUND = OPEN + 2300;
const SAY = OPEN + 2700;

const appear = (t: number, at: number, rise = 10) =>
  styled(envelope(t, at, Number.POSITIVE_INFINITY, { duration: 500, rise }));

/** Claude Code calling Pond's MCP server from a terminal. */
export function Terminal({ t }: { t: number }) {
  const w = lift(t, OPEN, CLOSE);
  if (w.opacity <= 0) return null;
  const typed = clamp(Math.floor((t - TYPE) / 22), 0, PROMPT.length);
  const calling = t >= CALL && t < FOUND;
  return (
    <div
      className={styles.terminal}
      style={styled({ opacity: w.opacity, dy: w.dy, blur: w.blur })}
    >
      <header className={styles.bar}>
        <span className={styles.lights}>
          <i />
          <i />
          <i />
        </span>
        <span className={styles.title}>
          <IconAnthropic width={14} height={14} />
          claude
          <span className={styles.muted}>~/studio/lookbook</span>
        </span>
      </header>
      <div className={styles.body}>
        <p className={styles.prompt}>
          <span className={styles.muted}>&gt;</span>
          <span>
            {PROMPT.slice(0, typed)}
            {typed < PROMPT.length ? <span className={styles.block} /> : null}
          </span>
        </p>
        <p className={styles.call} style={appear(t, CALL)}>
          <span
            className={styles.dot}
            data-state={calling ? "calling" : "done"}
            style={{
              opacity: calling && Math.floor((t - CALL) / 250) % 2 ? 0.3 : 1,
            }}
          >
            ●
          </span>
          <b>pond · search_saves</b>
          <span className={styles.muted}>
            {' (MCP)(query: "knitwear", limit: 4)'}
          </span>
        </p>
        <div className={styles.result} style={appear(t, FOUND)}>
          <p className={styles.found}>
            <span className={styles.muted}>⎿</span>Found 4 saves
          </p>
          <div className={styles.hits}>
            {HITS.map((hit, index) => {
              const Badge = brand(hit.source).Icon;
              return (
                <span
                  key={hit.id}
                  className={styles.hit}
                  style={appear(t, FOUND + 100 + index * 80, 14)}
                >
                  <img alt="" src={cover(hit.id)} className={styles.thumb} />
                  <Badge className={styles.badge} />
                </span>
              );
            })}
          </div>
        </div>
        <p className={styles.answer}>
          <span className={styles.dot} style={appear(t, SAY, 0)}>
            ●
          </span>
          <span>
            {ANSWER.split(" ").map((word, index) => (
              <span
                // biome-ignore lint/suspicious/noArrayIndexKey: words are static
                key={`${index}-${word}`}
                className={styles.word}
                style={appear(t, SAY + 80 + index * 40, 6)}
              >
                {word}
              </span>
            ))}
          </span>
        </p>
      </div>
    </div>
  );
}
