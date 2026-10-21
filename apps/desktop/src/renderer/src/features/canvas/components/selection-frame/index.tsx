import { cssVars } from "@pond/ui";
import { type Rect, useStore, ViewportPortal } from "@xyflow/react";
import styles from "./styles.module.css";

interface SelectionFrameProps {
  frame: Rect;
}

/** One box around a multi-selection, so the members can keep a lighter outline. */
export function SelectionFrame({ frame }: SelectionFrameProps) {
  const zoom = useStore((state) => state.transform[2]);
  return (
    <ViewportPortal>
      <div
        className={styles.frame}
        style={{
          ...cssVars({ "--frame-line": `${1.5 / zoom}px` }),
          width: frame.width,
          height: frame.height,
          transform: `translate(${frame.x}px, ${frame.y}px)`,
        }}
      />
    </ViewportPortal>
  );
}
