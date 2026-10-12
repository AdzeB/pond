import { Cursor } from "../../stage/cursor";
import { FRAME, FRAME_SRC, registerFrame } from "../../stage/frames";
import { envelope, styled } from "../../stage/timeline";
import { APP, ASK, appCrop, appPointer, FIND } from "../camera";
import { start } from "../timeline";
import styles from "./styles.module.css";

const REST = APP.width / 881;

function presence(t: number) {
  if (t < start("ask")) return envelope(t, start("find"), FIND.exit);
  return envelope(t, ASK.enter, ASK.exit);
}

/** The real app, always mounted so its state carries across beats, framed by the camera crop. */
export function App({ t }: { t: number }) {
  const crop = appCrop(t);
  const scale = crop ? APP.width / crop.width : 1;
  const p = crop ? appPointer(t) : null;
  const e = presence(t);
  return (
    <div
      className={styles.window}
      style={{
        left: APP.x,
        top: APP.y,
        width: APP.width,
        height: APP.height,
        ...styled(crop ? e : { opacity: 0, dy: 0, blur: 0 }),
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
      </div>
      {crop && p ? (
        <Cursor
          x={(p.x - crop.x) * scale}
          y={(p.y - crop.y) * scale}
          scale={p.scale * Math.sqrt(scale / REST)}
          opacity={p.opacity}
        />
      ) : null}
    </div>
  );
}
