import { useMemo } from "react";
import type { CardLayout } from "@/components/save-card-media";
import { formatNumber } from "@/lib/format";
import styles from "./styles.module.css";

const SPINNER_DOTS = [0, 1, 2, 3, 4, 5, 6, 7];

interface UploadingCardProps {
  count: number;
  layout: CardLayout;
  packedWidth: number;
  packedHeight: number;
  packedTop: number;
  packedLeft: number;
}

// Synthetic grid tile that stands in for saves still being ingested. The grid filter
// hides "ingesting" saves until they finish, so this gives the user proof that the
// thing they just saved from the extension is on its way.
export function UploadingCard({
  count,
  packedWidth,
  packedHeight,
  packedTop,
  packedLeft,
}: UploadingCardProps) {
  const liStyle = useMemo<React.CSSProperties>(
    () => ({
      position: "absolute",
      top: `${packedTop}px`,
      left: `${packedLeft}px`,
      width: `${packedWidth}px`,
      ["--packed-h" as never]: `${packedHeight}px`,
    }),
    [packedWidth, packedHeight, packedTop, packedLeft],
  );

  const label = `Saving ${formatNumber(count)} ${count === 1 ? "item" : "items"}`;

  return (
    <li className={styles.item} style={liStyle} aria-hidden={false}>
      <div className={styles.media} role="status" aria-label={label}>
        <span className={styles.spinner} aria-hidden>
          {SPINNER_DOTS.map((i) => (
            <span
              key={i}
              className={styles.dot}
              style={{ ["--i" as never]: i }}
            />
          ))}
        </span>
        <span className={styles.label}>{label}</span>
      </div>
    </li>
  );
}
