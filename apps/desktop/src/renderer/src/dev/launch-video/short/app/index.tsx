import { Cursor } from "../../stage/cursor";
import { FRAME, FRAME_SRC, registerFrame } from "../../stage/frames";
import { envelope, styled } from "../../stage/timeline";
import { APP, ASK, appCrop, appPointer, appSpotlight, FIND } from "../camera";
import { Spotlight } from "../spotlight";
import { start } from "../timeline";
import styles from "./styles.module.css";

function presence(t: number) {
  if (t < start("ask"))
    return envelope(t, start("find"), FIND.exit, { rise: 30 });
  return envelope(t, start("ask"), ASK.exit, { rise: 30 });
}

/** The whole app window, always mounted so its state carries across beats, framed by the camera. */
export function App({ t }: { t: number }) {
  const crop = appCrop(t);
  const scale = crop ? APP.width / crop.width : 1;
  const p = crop ? appPointer(t) : null;
  const spot = appSpotlight(t);
  return (
    <div
      className={styles.window}
      style={{
        left: APP.x,
        top: APP.y,
        width: APP.width,
        height: APP.height,
        ...styled(crop ? presence(t) : { opacity: 0, dy: 0, blur: 0 }),
      }}
    >
      <div
        className={styles.viewport}
        style={{
          width: FRAME.width,
          height: FRAME.height,
          transform: crop
            ? `scale(${scale}) translate(${-crop.x}px, ${-crop.y}px)`
            : undefined,
        }}
      >
        <iframe
          ref={registerFrame}
          className={styles.frame}
          src={FRAME_SRC}
          title="Pond"
        />
        {spot ? (
          <Spotlight hole={spot.hole} amount={spot.amount} radius={10} />
        ) : null}
      </div>
      {crop && p ? (
        <Cursor
          x={(p.x - crop.x) * scale}
          y={(p.y - crop.y) * scale}
          scale={p.scale}
          opacity={p.opacity}
        />
      ) : null}
    </div>
  );
}
