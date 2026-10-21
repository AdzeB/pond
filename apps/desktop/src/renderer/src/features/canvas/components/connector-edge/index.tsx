import {
  BaseEdge,
  EdgeLabelRenderer,
  type EdgeProps,
  getBezierPath,
  getSmoothStepPath,
  getStraightPath,
} from "@xyflow/react";
import { clsx as cn } from "clsx";
import { INK } from "../../lib/colors";
import {
  CONNECTOR_STYLE,
  type ConnectorEdge as ConnectorEdgeType,
} from "../../lib/document";
import { useBoard } from "../board/context";
import { ConnectorBar } from "../connector-bar";
import { EditableText } from "../editable-text";
import styles from "./styles.module.css";

export function ConnectorEdge({
  id,
  data,
  selected,
  sourceX,
  sourceY,
  sourcePosition,
  targetX,
  targetY,
  targetPosition,
}: EdgeProps<ConnectorEdgeType>) {
  const board = useBoard();
  const style = { ...CONNECTOR_STYLE, ...data };
  const ends = {
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  };
  const [path, labelX, labelY] =
    style.line === "elbow"
      ? getSmoothStepPath({ ...ends, borderRadius: 12 })
      : style.line === "straight"
        ? getStraightPath(ends)
        : getBezierPath(ends);
  const ink = INK[style.color];
  const arrow = `url(#${id}-arrow)`;
  const editing = board.editingId === id;
  return (
    <>
      <defs>
        <marker
          id={`${id}-arrow`}
          viewBox="0 0 12 12"
          refX={10}
          refY={6}
          markerWidth={12}
          markerHeight={12}
          markerUnits="userSpaceOnUse"
          orient="auto-start-reverse"
        >
          <path
            className={styles.arrow}
            d="M2.5 2L10 6L2.5 10"
            style={{ stroke: ink }}
          />
        </marker>
      </defs>
      {selected ? <path className={styles.halo} d={path} /> : null}
      <BaseEdge
        id={id}
        path={path}
        style={{
          stroke: ink,
          strokeDasharray: style.dashed ? "6 5" : undefined,
        }}
        markerStart={style.startArrow ? arrow : undefined}
        markerEnd={style.endArrow ? arrow : undefined}
      />
      <EdgeLabelRenderer>
        {style.label || editing ? (
          <div
            className={cn(styles.label, "nodrag", "nopan")}
            data-editing={editing || undefined}
            style={{
              transform: `translate(${labelX}px, ${labelY}px) translate(-50%, -50%)`,
            }}
          >
            <EditableText
              id={id}
              text={style.label}
              label="Connector Label"
              placeholder="Add label"
              hint=""
              variant="label"
            />
          </div>
        ) : null}
      </EdgeLabelRenderer>
      {board.connectorBarId === id ? (
        <ConnectorBar id={id} x={labelX} y={labelY} style={style} />
      ) : null}
    </>
  );
}
