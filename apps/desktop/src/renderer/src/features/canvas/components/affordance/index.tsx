import { IconArrowRotateClockwise, IconPlus } from "@pond/icons";
import { Button } from "@pond/ui";
import type { CanvasSide } from "@shared/canvas-contracts";
import { useReactFlow, useStore, ViewportPortal } from "@xyflow/react";
import { useRef } from "react";
import type { Bounds } from "../../lib/document";
import { snappedTurn } from "../../lib/edit";
import styles from "./styles.module.css";

const SIDES: readonly CanvasSide[] = ["top", "right", "bottom", "left"];

const SIDE_LABEL = {
  top: "Add Above",
  right: "Add Right",
  bottom: "Add Below",
  left: "Add Left",
} as const;

interface AffordanceProps {
  frame: Bounds;
  sides: readonly CanvasSide[];
  onCreate(side: CanvasSide): void;
  onRotate(rotation: number | undefined): void;
  onRotateStart(): void;
}

function anchor(frame: Bounds, side: CanvasSide) {
  switch (side) {
    case "top":
      return { x: frame.x + frame.width / 2, y: frame.y };
    case "right":
      return { x: frame.x + frame.width, y: frame.y + frame.height / 2 };
    case "bottom":
      return { x: frame.x + frame.width / 2, y: frame.y + frame.height };
    case "left":
      return { x: frame.x, y: frame.y + frame.height / 2 };
  }
}

export function Affordance({
  frame,
  sides,
  onCreate,
  onRotate,
  onRotateStart,
}: AffordanceProps) {
  const flow = useReactFlow();
  const zoom = useStore((state) => state.transform[2]);
  const started = useRef(false);
  const center = {
    x: frame.x + frame.width / 2,
    y: frame.y + frame.height / 2,
  };
  const knob = anchor(frame, "top");
  return (
    <ViewportPortal>
      {SIDES.filter((side) => sides.includes(side)).map((side) => {
        const point = anchor(frame, side);
        return (
          <div
            key={side}
            className={styles.slot}
            style={{
              transform: `translate(${point.x}px, ${point.y}px) translate(-50%, -50%) scale(${1 / zoom})`,
            }}
          >
            <Button
              icon
              size="xs"
              variant="secondary"
              rounding="full"
              aria-label={SIDE_LABEL[side]}
              onClick={(event) => {
                event.stopPropagation();
                onCreate(side);
              }}
            >
              <IconPlus size={12} />
            </Button>
          </div>
        );
      })}
      <div
        className={styles.slot}
        data-turn
        style={{
          transform: `translate(${knob.x}px, ${knob.y}px) translate(-50%, calc(-50% - 28px)) scale(${1 / zoom})`,
        }}
      >
        <Button
          icon
          size="xs"
          variant="secondary"
          rounding="full"
          aria-label="Rotate"
          onPointerDown={(event) => {
            if (event.button !== 0) return;
            event.stopPropagation();
            event.currentTarget.setPointerCapture(event.pointerId);
            started.current = false;
          }}
          onPointerMove={(event) => {
            if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
            if (!started.current) {
              started.current = true;
              onRotateStart();
            }
            const point = flow.screenToFlowPosition(
              { x: event.clientX, y: event.clientY },
              { snapToGrid: false },
            );
            const angle =
              (Math.atan2(point.y - center.y, point.x - center.x) * 180) /
                Math.PI +
              90;
            onRotate(snappedTurn(angle));
          }}
          onPointerUp={() => {
            started.current = false;
          }}
        >
          <IconArrowRotateClockwise size={12} />
        </Button>
      </div>
    </ViewportPortal>
  );
}
