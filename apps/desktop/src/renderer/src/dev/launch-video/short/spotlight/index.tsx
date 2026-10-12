import styles from "./styles.module.css";

export interface Hole {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface SpotlightProps {
  hole: Hole;
  /** 0 is off, 1 is fully dimmed around the hole. */
  amount: number;
  radius?: number;
}

/** Dims everything in its parent except one rounded cut-out. */
export function Spotlight({ hole, amount, radius = 12 }: SpotlightProps) {
  if (amount <= 0.002) return null;
  return (
    <span
      aria-hidden
      className={styles.spotlight}
      style={{
        left: hole.x,
        top: hole.y,
        width: hole.width,
        height: hole.height,
        borderRadius: radius,
        boxShadow: `0 0 0 4000px rgb(30 30 30 / ${0.42 * amount})`,
      }}
    />
  );
}
