import styles from "./styles.module.css";

const WASHES = [
  { color: "0 143 255", alpha: 0.13, x: 18, y: 22, r: 46, speed: 1 },
  { color: "123 108 255", alpha: 0.1, x: 84, y: 30, r: 40, speed: -0.8 },
  { color: "32 196 200", alpha: 0.09, x: 62, y: 88, r: 44, speed: 0.6 },
];

/** Soft light drifting behind every scene. */
export function Backdrop({ t }: { t: number }) {
  const phase = t / 9000;
  const backgroundImage = WASHES.map(({ color, alpha, x, y, r, speed }, i) => {
    const a = phase * speed * Math.PI * 2 + i * 2.1;
    const cx = x + Math.cos(a) * 6;
    const cy = y + Math.sin(a * 0.8) * 5;
    return `radial-gradient(${r}% ${r * 1.3}% at ${cx}% ${cy}%, rgb(${color} / ${alpha}), transparent 70%)`;
  }).join(", ");
  return <div className={styles.backdrop} style={{ backgroundImage }} />;
}
