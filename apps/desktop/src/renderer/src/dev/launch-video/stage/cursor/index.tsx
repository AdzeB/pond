import { ease, mix, progress } from "../timeline";
import styles from "./styles.module.css";

export interface Waypoint {
  /** When the pointer arrives. */
  at: number;
  x: number;
  y: number;
  /** How long the glide into this point takes. */
  move?: number;
}

/** Where a pointer is at `t`, gliding into each waypoint by its `at`. */
export function glide(t: number, points: readonly Waypoint[]) {
  let x = points[0]?.x ?? 0;
  let y = points[0]?.y ?? 0;
  for (const point of points) {
    const move = point.move ?? 500;
    const k = ease.inOut(progress(t, point.at - move, move));
    x = mix(x, point.x, k);
    y = mix(y, point.y, k);
  }
  return { x, y };
}

export const pressing = (t: number, presses: readonly number[]) =>
  presses.some((at) => t >= at && t < at + 140);

interface CursorProps {
  x: number;
  y: number;
  scale?: number;
  opacity?: number;
}

/** A macOS arrow pointer whose tip sits at (x, y) in its parent. */
export function Cursor({ x, y, scale = 1, opacity = 1 }: CursorProps) {
  if (opacity <= 0) return null;
  return (
    <svg
      aria-hidden
      className={styles.cursor}
      width="28"
      height="34"
      viewBox="0 0 28 34"
      style={{
        opacity,
        transform: `translate(${x - 4}px, ${y - 3}px) scale(${scale})`,
      }}
    >
      <path
        d="M4 3 L4 27 L10 21.5 L14.2 31 L18.4 29.2 L14.3 20 L22 20 Z"
        fill="#000"
        stroke="#fff"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}
