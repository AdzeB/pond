import { Browser } from "../../stage/browser";
import { clamp, envelope, styled } from "../../stage/timeline";
import { APP, track } from "../camera";
import { end, start } from "../timeline";
import styles from "./styles.module.css";

export const SAVE = {
  press: start("save") + 1500,
  exit: end("save") - 350,
};

/** Points in the 1280 by 700 browser window, measured from the stage's X post. */
const PAGE = { width: 1280, height: 700 };
const BOOKMARK = { x: 751, y: 585 };
const EXTENSION = { x: 1241, y: 27 };
const REST = { x: 35, y: 0, width: 1210 };

/** A crop of `width` centered on `point`, kept inside the browser window. */
function around(point: { x: number; y: number }, width: number) {
  const height = (width * APP.height) / APP.width;
  return {
    x: clamp(point.x - width / 2, 0, PAGE.width - width),
    y: clamp(point.y - height / 2, 0, PAGE.height - height),
    width,
  };
}

const KEYS = [
  { at: start("save"), ...REST },
  { at: SAVE.press - 650, ...REST, move: 1 },
  { at: SAVE.press - 80, ...around(BOOKMARK, 640), move: 700 },
  { at: SAVE.press + 500, ...around(BOOKMARK, 640), move: 1 },
  { at: SAVE.press + 1000, ...around(EXTENSION, 560), move: 500 },
];

/** An X post bookmarked in the browser, the camera following the click to Pond's extension. */
export function Save({ t }: { t: number }) {
  if (t < start("save") - 1200 || t > end("save") + 50) return null;
  const crop = track(t, KEYS);
  const scale = APP.width / crop.width;
  const e = envelope(t, start("save"), SAVE.exit, { rise: 40, duration: 800 });
  return (
    <div
      className={styles.window}
      style={{
        left: APP.x,
        top: APP.y,
        width: APP.width,
        height: APP.height,
        ...styled(e),
      }}
    >
      <div
        className={styles.view}
        style={{
          transform: `scale(${scale}) translate(${-crop.x}px, ${-crop.y}px)`,
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
      </div>
    </div>
  );
}
