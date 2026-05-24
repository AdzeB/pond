import styles from "./fragments.module.css";
import { Thumb } from "./thumb";

interface JustifiedGridProps {
  count?: number;
  rowHeight?: number;
  seedOffset?: number;
  density?: "tight" | "loose";
}

const ASPECTS = [
  1, 1.5, 0.75, 1.33, 0.66, 1.1, 1.7, 1, 0.85, 1.4, 1.2, 0.9, 1.6, 1, 0.8,
] as const;

export function JustifiedGrid({
  count = 12,
  rowHeight = 96,
  seedOffset = 0,
  density = "loose",
}: JustifiedGridProps) {
  const items = Array.from({ length: count }, (_, i) => ({
    seed: i + seedOffset,
    aspect: ASPECTS[i % ASPECTS.length] ?? 1,
  }));

  return (
    <div
      className={styles["justified-grid"]}
      data-density={density}
      style={{ ["--row-h" as string]: `${rowHeight}px` }}
    >
      {items.map((item) => (
        <div
          key={item.seed}
          className={styles["justified-cell"]}
          style={{
            flexGrow: item.aspect,
            flexBasis: `${item.aspect * rowHeight}px`,
            aspectRatio: String(item.aspect),
          }}
        >
          <Thumb seed={item.seed} aspect={item.aspect} />
        </div>
      ))}
    </div>
  );
}
