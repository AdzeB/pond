import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./styles.module.css";

export function CaptureShell() {
  const origin = useRef<{ x: number; y: number } | null>(null);
  const latest = useRef<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const [rect, setRect] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  const cancel = useCallback(() => {
    void window.pond.query("capture.cancel", {});
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") cancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cancel]);

  return (
    <div
      className={styles.root}
      onPointerDown={(event) => {
        origin.current = { x: event.clientX, y: event.clientY };
        const next = {
          x: event.clientX,
          y: event.clientY,
          width: 0,
          height: 0,
        };
        latest.current = next;
        setRect(next);
      }}
      onPointerMove={(event) => {
        if (!origin.current) return;
        const next = {
          x: Math.min(origin.current.x, event.clientX),
          y: Math.min(origin.current.y, event.clientY),
          width: Math.abs(event.clientX - origin.current.x),
          height: Math.abs(event.clientY - origin.current.y),
        };
        latest.current = next;
        setRect(next);
      }}
      onPointerUp={() => {
        const next = latest.current;
        origin.current = null;
        latest.current = null;
        if (!next || next.width < 4 || next.height < 4) {
          cancel();
          return;
        }
        void window.pond.query("capture.area", next);
      }}
    >
      {rect ? (
        <div
          className={styles.rect}
          style={{
            left: rect.x,
            top: rect.y,
            width: rect.width,
            height: rect.height,
          }}
        />
      ) : (
        <p className={styles.hint}>Drag to capture an area. Esc cancels.</p>
      )}
    </div>
  );
}
