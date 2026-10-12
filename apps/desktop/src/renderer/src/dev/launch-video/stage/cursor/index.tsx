import styles from "./styles.module.css";

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
