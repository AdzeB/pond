import type { CanvasSide } from "@shared/canvas-contracts";
import { Handle, Position } from "@xyflow/react";
import styles from "./styles.module.css";

const SIDES: ReadonlyArray<[CanvasSide, Position]> = [
  ["top", Position.Top],
  ["right", Position.Right],
  ["bottom", Position.Bottom],
  ["left", Position.Left],
];

/** Every side is a source; the board connects in loose mode so any side can link to any other. */
export function Handles() {
  return SIDES.map(([id, position]) => (
    <Handle
      key={id}
      id={id}
      type="source"
      position={position}
      className={styles.handle}
    />
  ));
}
