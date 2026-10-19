import { type PointerEvent, useState } from "react";
import type { OverlayResult } from "@/utils/messaging";
import { clampPoint, type Point, regionBetween } from "../geometry";
import { Hint } from "../hint";
import { useEscape } from "../use-escape";
import styles from "./styles.module.css";

interface RegionPickerProps {
  onFinish: (result: OverlayResult | null) => void;
}

export function RegionPicker({ onFinish }: RegionPickerProps) {
  const [drag, setDrag] = useState<{ start: Point; end: Point } | null>(null);
  useEscape(() => onFinish(null));

  const point = (event: PointerEvent) =>
    clampPoint(event.clientX, event.clientY);

  const selection = drag
    ? {
        left: Math.min(drag.start.x, drag.end.x),
        top: Math.min(drag.start.y, drag.end.y),
        width: Math.abs(drag.start.x - drag.end.x),
        height: Math.abs(drag.start.y - drag.end.y),
      }
    : null;

  return (
    <div
      className={styles.surface}
      data-dragging={drag ? "" : undefined}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        const start = point(event);
        setDrag({ start, end: start });
      }}
      onPointerMove={(event) => {
        if (drag) setDrag({ ...drag, end: point(event) });
      }}
      onPointerUp={(event) => {
        if (!drag) return;
        const region = regionBetween(drag.start, point(event));
        setDrag(null);
        if (region) onFinish({ kind: "region", region });
      }}
      onPointerCancel={() => setDrag(null)}
    >
      {selection ? (
        <div className={styles.selection} style={selection} />
      ) : (
        <Hint>Drag to capture a region. Press Esc to cancel.</Hint>
      )}
    </div>
  );
}
