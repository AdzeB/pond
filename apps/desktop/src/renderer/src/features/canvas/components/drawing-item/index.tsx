import type { NodeProps } from "@xyflow/react";
import { useMemo } from "react";
import { INK } from "../../lib/colors";
import type { DrawingNode } from "../../lib/document";
import { strokePath } from "../../lib/stroke";
import styles from "./styles.module.css";

export function DrawingItem({
  data,
  width,
  height,
  selected,
}: NodeProps<DrawingNode>) {
  const path = useMemo(
    () => strokePath(data.points, data.size),
    [data.points, data.size],
  );
  return (
    <svg
      className={styles.drawing}
      data-selected={selected || undefined}
      data-highlight={data.ink === "highlight" || undefined}
      style={
        data.rotation ? { transform: `rotate(${data.rotation}deg)` } : undefined
      }
      width={width}
      height={height}
      aria-hidden="true"
    >
      <path d={path} fill={INK[data.color]} />
    </svg>
  );
}
