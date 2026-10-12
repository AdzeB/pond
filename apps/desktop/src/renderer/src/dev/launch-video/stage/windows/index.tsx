import { shot } from "../camera";
import { FRAME_SIZE, FRAME_SRC, type FrameId, registerFrame } from "../frames";
import styles from "./styles.module.css";

const IDS: readonly FrameId[] = ["app", "settings"];
const refs = Object.fromEntries(
  IDS.map((id) => [
    id,
    (element: HTMLIFrameElement | null) => registerFrame(id, element),
  ]),
) as Record<FrameId, (element: HTMLIFrameElement | null) => void>;

/** The real app and Settings windows, always mounted so their state carries across beats. */
export function Windows({ t }: { t: number }) {
  return (
    <>
      {IDS.map((id) => {
        const s = shot(id, t);
        return (
          <div
            key={id}
            className={styles.window}
            data-frame={id}
            style={{
              width: FRAME_SIZE[id].width,
              height: FRAME_SIZE[id].height,
              transform: `translate(${s.x}px, ${s.y}px) scale(${s.scale})`,
              opacity: s.opacity,
              visibility: s.opacity > 0 ? "visible" : "hidden",
            }}
          >
            <iframe
              ref={refs[id]}
              className={styles.frame}
              src={FRAME_SRC[id]}
              title={id}
            />
          </div>
        );
      })}
    </>
  );
}
