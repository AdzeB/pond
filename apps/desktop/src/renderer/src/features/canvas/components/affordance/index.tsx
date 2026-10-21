import { useReactFlow, useStore, ViewportPortal } from "@xyflow/react";
import { useRef } from "react";
import type { Bounds } from "../../lib/document";
import { turnOf } from "../../lib/edit";
import styles from "./styles.module.css";

const CORNERS = ["nw", "ne", "se", "sw"] as const;

interface AffordanceProps {
  frame: Bounds;
  rotation: number | undefined;
  onRotate(rotation: number | undefined): void;
  onRotateStart(): void;
}

function cornerOf(frame: Bounds, corner: (typeof CORNERS)[number]) {
  switch (corner) {
    case "nw":
      return { x: frame.x, y: frame.y, ox: -1, oy: -1 };
    case "ne":
      return { x: frame.x + frame.width, y: frame.y, ox: 1, oy: -1 };
    case "se":
      return {
        x: frame.x + frame.width,
        y: frame.y + frame.height,
        ox: 1,
        oy: 1,
      };
    case "sw":
      return { x: frame.x, y: frame.y + frame.height, ox: -1, oy: 1 };
  }
}

/** Rotation zones sit just outside each corner, past the resize handles. */
export function Affordance({
  frame,
  rotation,
  onRotate,
  onRotateStart,
}: AffordanceProps) {
  const flow = useReactFlow();
  const zoom = useStore((state) => state.transform[2]);
  const grab = useRef<{ angle: number; rotation: number } | null>(null);
  const started = useRef(false);
  const center = {
    x: frame.x + frame.width / 2,
    y: frame.y + frame.height / 2,
  };
  const pad = 14 / zoom;
  const angleAt = (clientX: number, clientY: number) => {
    const point = flow.screenToFlowPosition(
      { x: clientX, y: clientY },
      { snapToGrid: false },
    );
    return (Math.atan2(point.y - center.y, point.x - center.x) * 180) / Math.PI;
  };
  return (
    <ViewportPortal>
      {CORNERS.map((corner) => {
        const point = cornerOf(frame, corner);
        return (
          <button
            key={corner}
            type="button"
            className={styles.turn}
            aria-label="Rotate"
            style={{
              transform: `translate(${point.x + point.ox * pad}px, ${point.y + point.oy * pad}px) translate(-50%, -50%) scale(${1 / zoom})`,
            }}
            onPointerDown={(event) => {
              if (event.button !== 0) return;
              event.stopPropagation();
              event.currentTarget.setPointerCapture(event.pointerId);
              grab.current = {
                angle: angleAt(event.clientX, event.clientY),
                rotation: rotation ?? 0,
              };
              started.current = false;
            }}
            onPointerMove={(event) => {
              const start = grab.current;
              if (!start) return;
              if (!started.current) {
                started.current = true;
                onRotateStart();
              }
              const angle =
                start.rotation +
                angleAt(event.clientX, event.clientY) -
                start.angle;
              onRotate(turnOf(angle, event.shiftKey ? 15 : 1));
            }}
            onPointerUp={() => {
              grab.current = null;
            }}
            onLostPointerCapture={() => {
              grab.current = null;
            }}
          />
        );
      })}
    </ViewportPortal>
  );
}
