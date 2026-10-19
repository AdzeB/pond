import { useRef, useState } from "react";
import type { CaptureRegion, OverlayResult } from "@/utils/messaging";
import { viewportRegion } from "../geometry";
import { Hint } from "../hint";
import { useEscape } from "../use-escape";
import styles from "./styles.module.css";

interface ElementPickerProps {
  onFinish: (result: OverlayResult | null) => void;
}

export function ElementPicker({ onFinish }: ElementPickerProps) {
  const surface = useRef<HTMLDivElement>(null);
  const [target, setTarget] = useState<CaptureRegion | null>(null);
  useEscape(() => onFinish(null));

  /** The surface covers the page, so step aside for one hit test to find what's under it. */
  const regionAt = (x: number, y: number): CaptureRegion | null => {
    const node = surface.current;
    if (!node) return null;
    node.style.pointerEvents = "none";
    const element = document.elementFromPoint(x, y);
    node.style.pointerEvents = "";
    if (!element || element.tagName === "POND-OVERLAY") return null;
    return viewportRegion(element.getBoundingClientRect());
  };

  return (
    <div
      ref={surface}
      role="application"
      aria-label="Element picker"
      className={styles.surface}
      onPointerMove={(event) =>
        setTarget(regionAt(event.clientX, event.clientY))
      }
      onKeyDown={(event) => {
        if (event.key === "Enter" && target)
          onFinish({ kind: "region", region: target });
      }}
      onClick={(event) => {
        if (event.button !== 0) return;
        event.preventDefault();
        const region = regionAt(event.clientX, event.clientY);
        if (region) onFinish({ kind: "region", region });
      }}
    >
      {target ? (
        <div
          className={styles.highlight}
          style={{
            left: target.x,
            top: target.y,
            width: target.width,
            height: target.height,
          }}
        />
      ) : null}
      <Hint>Click an element to capture it. Press Esc to cancel.</Hint>
    </div>
  );
}
