import { Button } from "@pond/ui";
import { useCallback, useEffect, useRef, useState } from "react";
import { CardThumb } from "@/features/saves/components/card/media/media";
import { useSave } from "@/features/saves/hooks/use-saves";
import {
  applyInspect,
  flipPatch,
  resetTransformPatch,
  rotatePatch,
} from "@/features/saves/lib/inspect-actions";
import { mediaTransformStyle } from "@/features/saves/lib/media-transform";
import { normalise } from "@/features/saves/lib/reconcile";
import { startNativeDrag } from "@/features/saves/lib/start-drag";
import { pool } from "@/features/saves/state/pool";
import type { Save } from "@/features/saves/types";
import styles from "./preview-shell.module.css";

export function PreviewShell({ id }: { id: string }) {
  const [loaded, setLoaded] = useState<Save | null>(null);
  const live = useSave(id);
  const save = live ?? loaded;
  const [zoom, setZoom] = useState(1);
  const [origin, setOrigin] = useState({ x: 50, y: 50 });
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const rightDrag = useRef<{ x: number; y: number } | null>(null);
  const leftDrag = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    void window.pond.query("saves.get", { id }).then((raw) => {
      const next = normalise(raw);
      if (!next) return;
      pool.upsert(next);
      setLoaded(next);
    });
  }, [id]);

  const onWheel = useCallback((event: React.WheelEvent) => {
    if (!event.altKey && event.buttons !== 2) return;
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    setOrigin({
      x: ((event.clientX - rect.left) / rect.width) * 100,
      y: ((event.clientY - rect.top) / rect.height) * 100,
    });
    setZoom((value) => Math.min(8, Math.max(1, value - event.deltaY * 0.01)));
  }, []);

  if (!save) return <div className={styles.root}>Loading preview</div>;

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: pan and zoom surface
    <div
      className={styles.root}
      onWheel={onWheel}
      onContextMenu={(event) => event.preventDefault()}
      onPointerDown={(event) => {
        if (event.button === 2) {
          rightDrag.current = { x: event.clientX, y: event.clientY };
          return;
        }
        if (event.button === 0 && zoom > 1) {
          leftDrag.current = { x: event.clientX, y: event.clientY };
        }
      }}
      onPointerMove={(event) => {
        if (rightDrag.current) {
          const dy = event.clientY - rightDrag.current.y;
          rightDrag.current = { x: event.clientX, y: event.clientY };
          setZoom((value) => Math.min(8, Math.max(1, value - dy * 0.01)));
          return;
        }
        if (leftDrag.current) {
          const start = leftDrag.current;
          setPan((value) => ({
            x: value.x + event.clientX - start.x,
            y: value.y + event.clientY - start.y,
          }));
          leftDrag.current = { x: event.clientX, y: event.clientY };
        }
      }}
      onPointerUp={() => {
        rightDrag.current = null;
        leftDrag.current = null;
      }}
    >
      {/* biome-ignore lint/a11y/noStaticElementInteractions: native drag from the preview frame */}
      <div
        className={styles.frame}
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: `${origin.x}% ${origin.y}%`,
        }}
        draggable
        onDragStart={(event) => {
          event.preventDefault();
          startNativeDrag(save.id);
        }}
      >
        <div style={mediaTransformStyle(save)} className={styles.media}>
          <CardThumb save={save} />
        </div>
      </div>
      <div className={styles.tools}>
        <Button
          size="xs"
          variant="secondary"
          onClick={() =>
            void applyInspect(save.id, rotatePatch(save, -90), "inspect:rotate")
          }
        >
          Rotate Left
        </Button>
        <Button
          size="xs"
          variant="secondary"
          onClick={() =>
            void applyInspect(save.id, rotatePatch(save, 90), "inspect:rotate")
          }
        >
          Rotate Right
        </Button>
        <Button
          size="xs"
          variant="secondary"
          onClick={() =>
            void applyInspect(save.id, flipPatch(save, "x"), "inspect:flip")
          }
        >
          Flip Horizontal
        </Button>
        <Button
          size="xs"
          variant="secondary"
          onClick={() =>
            void applyInspect(save.id, flipPatch(save, "y"), "inspect:flip")
          }
        >
          Flip Vertical
        </Button>
        <Button
          size="xs"
          variant="secondary"
          onClick={() =>
            void applyInspect(save.id, resetTransformPatch(), "inspect:reset")
          }
        >
          Reset
        </Button>
      </div>
    </div>
  );
}
