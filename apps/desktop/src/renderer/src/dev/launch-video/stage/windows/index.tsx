import { shot, WINDOW } from "../camera";
import { FRAME, FRAME_SRC, registerFrame } from "../frames";
import styles from "./styles.module.css";

/** The real app, always mounted so its state carries across beats, cropped to the part each beat needs. */
export function Windows({ t }: { t: number }) {
  const s = shot(t);
  const scale = s ? WINDOW.width / s.crop.width : 1;
  return (
    <div
      className={styles.window}
      style={{
        left: WINDOW.x,
        top: WINDOW.y,
        width: WINDOW.width,
        height: WINDOW.height,
        opacity: s?.opacity ?? 0,
        transform: `translateY(${s?.dy ?? 0}px)`,
        filter: s && s.blur > 0.05 ? `blur(${s.blur}px)` : undefined,
        visibility: s ? undefined : "hidden",
      }}
    >
      <div
        className={styles.viewport}
        style={{
          width: FRAME.width,
          height: FRAME.height,
          transform: s
            ? `scale(${scale}) translate(${-s.crop.x}px, ${-s.crop.y}px)`
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
    </div>
  );
}
