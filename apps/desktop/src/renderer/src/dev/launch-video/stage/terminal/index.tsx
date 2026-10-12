import { IconAnthropic } from "@pond/icons/social-media";
import { brand } from "../brands";
import { cover, sample } from "../media";
import { clamp, closes, envelope, lift, opens, styled } from "../timeline";
import styles from "./styles.module.css";

const PROMPT = "Pull black coat references from Pond for the lookbook";
const ANSWER =
  "Four looks from your library: the long black coat, round sunglasses, black boots, and an all-black runway set.";
const HITS = [
  "Long black coat",
  "Black coat, round sunglasses",
  "Black coat, black boots",
  "All black, runway",
].map(sample);

const appear = (t: number, at: number, rise = 10) =>
  styled(envelope(t, at, Number.POSITIVE_INFINITY, { duration: 500, rise }));

/** Claude Code calling Pond's MCP server from a terminal. */
export function Terminal({
  t,
  open = opens("connect"),
  close = closes("connect"),
}: {
  t: number;
  open?: number;
  close?: number;
}) {
  const typing = open + 400;
  const call = open + 1700;
  const found = open + 2300;
  const say = open + 2750;
  const w = lift(t, open, close);
  if (w.opacity <= 0) return null;
  const typed = clamp(Math.floor((t - typing) / 22), 0, PROMPT.length);
  const calling = t >= call && t < found;
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
        <p className={styles.call} style={appear(t, call)}>
          <span
            className={styles.dot}
            data-state={calling ? "calling" : "done"}
            style={{
              opacity: calling && Math.floor((t - call) / 250) % 2 ? 0.3 : 1,
            }}
          >
            ●
          </span>
          <b>pond · search_saves</b>
          <span className={styles.muted}>
            {' (MCP)(query: "black coat", limit: 4)'}
          </span>
        </p>
        <div className={styles.result} style={appear(t, found)}>
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
                  style={appear(t, found + 100 + index * 80, 14)}
                >
                  <img alt="" src={cover(hit.id)} className={styles.thumb} />
                  <Badge className={styles.badge} />
                </span>
              );
            })}
          </div>
        </div>
        <p className={styles.answer}>
          <span className={styles.dot} style={appear(t, say, 0)}>
            ●
          </span>
          <span>
            {ANSWER.split(" ").map((word, index) => (
              <span
                // biome-ignore lint/suspicious/noArrayIndexKey: words are static
                key={`${index}-${word}`}
                className={styles.word}
                style={appear(t, say + 80 + index * 62, 6)}
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
