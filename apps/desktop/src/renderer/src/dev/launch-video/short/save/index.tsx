import { Browser } from "../../stage/browser";
import { ease, envelope, progress, styled } from "../../stage/timeline";
import { track } from "../camera";
import { Spotlight } from "../spotlight";
import { end, start } from "../timeline";
import styles from "./styles.module.css";

const SAVE = {
  press: start("save") + 1300,
  exit: end("save") - 350,
};

/** Pond's toolbar button in stage coordinates, once the browser is centered. */
const EXTENSION = { x: 1534, y: 196, width: 56, height: 44 };
const WHOLE = { x: 0, y: 0, width: 1920 };
const BUTTON = { x: 600, y: 160, width: 1020 };

const KEYS = [
  { at: start("save"), ...WHOLE },
  { at: SAVE.press + 150, ...WHOLE, move: 1 },
  { at: SAVE.press + 850, ...BUTTON, move: 700 },
];

/** An X post bookmarked in the browser, then the page dims around Pond's extension confirming it. */
export function Save({ t }: { t: number }) {
  if (t < start("save") - 1200 || t > end("save") + 50) return null;
  const view = track(t, KEYS);
  const scale = 1920 / view.width;
  const e = envelope(t, start("save"), SAVE.exit, { rise: 30, duration: 800 });
  const dim = ease.inOut(progress(t, SAVE.press + 200, 350));
  return (
    <div
      className={styles.stage}
      style={{
        ...styled(e),
        transform: `scale(${scale}) translate(${-view.x}px, ${-view.y}px) translateY(${e.dy}px)`,
      }}
    >
      <div className={styles.page}>
        <Browser
          t={t}
          open={start("save") - 1200}
          close={end("save") + 1000}
          press={SAVE.press}
        />
      </div>
      <Spotlight hole={EXTENSION} amount={dim} radius={14} />
    </div>
  );
}
