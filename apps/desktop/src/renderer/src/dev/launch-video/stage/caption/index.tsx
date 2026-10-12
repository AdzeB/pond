import { BEATS, type BeatId, ease, presence, progress } from "../timeline";
import { Words } from "../words";
import styles from "./styles.module.css";

const CAPTIONS: Partial<Record<BeatId, readonly [string, string]>> = {
  save: ["Save it.", "Like or bookmark as usual. Pond keeps a copy."],
  sync: ["Sync it.", "Connect once, and Pond saves in the background."],
  own: ["Own it.", "Everything stays in a folder on your Mac."],
  enrich: ["Enrich it.", "Captions, text, and colors, on-device."],
  find: ["Find it.", "Plain-language search, precise filters."],
  ask: ["Ask it.", "With your key or a local model."],
  theme: ["Theme it.", "Pick a look, and every window follows."],
  connect: ["Connect it.", "Cursor and Claude, over MCP."],
};

/** The line above each product beat. */
export function Captions({ t }: { t: number }) {
  return (
    <>
      {(Object.keys(CAPTIONS) as BeatId[]).map((beat) => {
        const caption = CAPTIONS[beat];
        const opacity = presence(t, beat, 1, 280);
        if (!caption || opacity <= 0) return null;
        const start = BEATS[beat][0];
        const exit = ease.in(progress(t, BEATS[beat][1] - 280, 280));
        return (
          <p
            key={beat}
            className={styles.caption}
            style={{
              opacity,
              transform: `translateY(${-exit * 12}px)`,
            }}
          >
            <Words
              t={t}
              start={start + 80}
              runs={[
                { text: `${caption[0]} `, tone: "strong" },
                { text: caption[1], tone: "muted" },
              ]}
            />
          </p>
        );
      })}
    </>
  );
}
