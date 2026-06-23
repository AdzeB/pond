import { BorderBeam } from "border-beam";
import { useMemo } from "react";
import type { CardLayout } from "@/components/save-card-media";
import { formatNumber } from "@/lib/format";
import styles from "./styles.module.css";

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

  const formattedCount = formatNumber(count);
  const noun = count === 1 ? "item" : "items";
  const label = `Saving ${formattedCount} ${noun}`;

  return (
    <li className={styles.item} style={liStyle} aria-hidden={false}>
      <BorderBeam
        className={styles.beam}
        colorVariant="ocean"
        staticColors
        borderRadius={12}
        duration={3}
        saturation={1.1}
      >
        <div className={styles.media} role="status" aria-label={label}>
          <span className={styles.content}>
            <span className={styles.count}>{formattedCount}</span>
            <span className={styles.label}>Saving {noun}</span>
          </span>
        </div>
      </BorderBeam>
    </li>
  );
}
