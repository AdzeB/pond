import {
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
  useState,
} from "react";
import styles from "./styles.module.css";

const MIN_HEIGHT = 180;
const MAX_HEIGHT = 480;
const DEFAULT_HEIGHT = 300;

export function HarvesterDrawer({ children }: { children: ReactNode }) {
  const [height, setHeight] = useState(DEFAULT_HEIGHT);

  function onPointerDown(event: ReactPointerEvent<HTMLHRElement>) {
    if (event.button !== 0) return;
    event.preventDefault();
    const handle = event.currentTarget;
    const startY = event.clientY;
    const startHeight = height;
    handle.setPointerCapture(event.pointerId);
    const move = (next: PointerEvent) => {
      setHeight(clampHeight(startHeight + (startY - next.clientY)));
    };
    const stop = () => {
      handle.removeEventListener("pointermove", move);
      handle.removeEventListener("pointerup", stop);
      handle.removeEventListener("pointercancel", stop);
    };
    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", stop);
    handle.addEventListener("pointercancel", stop);
  }

  function onKeyDown(event: ReactKeyboardEvent<HTMLHRElement>) {
    if (event.key === "ArrowUp") setHeight((value) => clampHeight(value + 24));
    if (event.key === "ArrowDown")
      setHeight((value) => clampHeight(value - 24));
    if (event.key === "Home") setHeight(MIN_HEIGHT);
    if (event.key === "End") setHeight(MAX_HEIGHT);
  }

  return (
    <section className={styles.drawer} style={{ height }} aria-label="Details">
      <hr
        className={styles.handle}
        aria-orientation="horizontal"
        aria-label="Resize Details"
        aria-valuemin={MIN_HEIGHT}
        aria-valuemax={MAX_HEIGHT}
        aria-valuenow={height}
        aria-valuetext={`${height} pixels`}
        tabIndex={0}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
      />
      <div className={styles.body}>{children}</div>
    </section>
  );
}

function clampHeight(value: number): number {
  return Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, Math.round(value)));
}
