import { Button } from "@pond/ui";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  selection,
  useSelectionAnchor,
  useSelectionSize,
} from "@/features/library/state/selection";
import { CardThumb } from "@/features/saves/components/card/media/media";
import { useSave } from "@/features/saves/hooks/use-saves";
import {
  adjacentVisibleSaveId,
  applyInspect,
  clampCrop,
  cropPatch,
  flipPatch,
  resetTransformPatch,
  rotatePatch,
} from "@/features/saves/lib/inspect-actions";
import { mediaTransformStyle } from "@/features/saves/lib/media-transform";
import { mutateSave } from "@/features/saves/lib/mutate";
import { selectOnlySave } from "@/features/saves/lib/select";
import { startNativeDrag } from "@/features/saves/lib/start-drag";
import { inspect, useInspect } from "@/features/saves/state/inspect";
import type { Save } from "@/features/saves/types";
import { prompt } from "@/shared/components/prompt-dialog/prompt-dialog";
import styles from "./hover-preview.module.css";

function inEditable(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    Boolean(target.closest("input, textarea, [contenteditable='true']"))
  );
}

function placeComment(save: Save, origin: { x: number; y: number }): void {
  prompt({
    title: "Add Comment",
    confirmLabel: "Add",
    placeholder: "Comment",
    onConfirm: (text) => {
      const next = text.trim();
      if (!next) return;
      const comments = [
        ...(save.comments ?? []),
        {
          id: crypto.randomUUID(),
          x: origin.x,
          y: origin.y,
          w: 0.08,
          h: 0.08,
          text: next,
        },
      ];
      void mutateSave(
        save.id,
        { comments },
        { actorReason: "inspect:comment" },
      );
    },
  });
}

export function HoverPreview() {
  const [spaceOpen, setSpaceOpen] = useState(false);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [origin, setOrigin] = useState({ x: 50, y: 50 });
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [cropping, setCropping] = useState(false);
  const [commenting, setCommenting] = useState(false);
  const [draftCrop, setDraftCrop] = useState<{
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);
  const rightDrag = useRef<{ x: number; y: number; accX: number } | null>(null);
  const leftDrag = useRef<{ x: number; y: number } | null>(null);
  const cropStart = useRef<{ x: number; y: number } | null>(null);
  const { grayscale, compare } = useInspect();
  const selectedCount = useSelectionSize();
  const liveAnchor = useSelectionAnchor();
  const compareIds = compare ? [...selection.snapshot()].slice(0, 2) : [];
  const id = spaceOpen ? liveAnchor : hoverId;
  const save = useSave(id);
  const compareA = useSave(compareIds[0] ?? null);
  const compareB = useSave(compareIds[1] ?? null);

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey) return;
      if (inEditable(event.target)) return;
      if (event.key === "z" || event.key === "Z") {
        if (event.altKey) return;
        setHoverId(selection.getAnchor());
        return;
      }
      if (event.code === "Space" && !event.repeat) {
        event.preventDefault();
        setSpaceOpen(true);
        setZoom(1);
        setPan({ x: 0, y: 0 });
      }
    };
    const up = (event: KeyboardEvent) => {
      if (event.key === "z" || event.key === "Z") setHoverId(null);
      if (event.code === "Space") {
        setSpaceOpen(false);
        setCropping(false);
        setCommenting(false);
        setDraftCrop(null);
      }
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSpaceOpen(false);
        setHoverId(null);
        setCropping(false);
        setCommenting(false);
        inspect.setCompare(false);
        return;
      }
      if (
        (event.key === "g" || event.key === "G") &&
        event.altKey &&
        (event.metaKey || event.ctrlKey)
      ) {
        event.preventDefault();
        inspect.toggleGrayscale();
      }
      if (
        (event.key === "p" || event.key === "P") &&
        event.shiftKey &&
        (event.metaKey || event.ctrlKey)
      ) {
        event.preventDefault();
        inspect.pinCurrent();
      }
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("keydown", key);
    const blur = () => {
      setSpaceOpen(false);
      setHoverId(null);
    };
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("keydown", key);
      window.removeEventListener("blur", blur);
    };
  }, []);

  const onWheel = useCallback(
    (event: React.WheelEvent) => {
      if (!spaceOpen) return;
      if (!event.altKey && event.buttons !== 2) return;
      event.preventDefault();
      const rect = event.currentTarget.getBoundingClientRect();
      setOrigin({
        x: ((event.clientX - rect.left) / rect.width) * 100,
        y: ((event.clientY - rect.top) / rect.height) * 100,
      });
      setZoom((value) => Math.min(8, Math.max(1, value - event.deltaY * 0.01)));
    },
    [spaceOpen],
  );

  const onContext = useCallback(
    (event: React.MouseEvent) => {
      if (!spaceOpen) return;
      event.preventDefault();
    },
    [spaceOpen],
  );

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!spaceOpen) return;
      const rect = event.currentTarget.getBoundingClientRect();
      const nx = (event.clientX - rect.left) / rect.width;
      const ny = (event.clientY - rect.top) / rect.height;
      if (event.button === 2) {
        rightDrag.current = { x: event.clientX, y: event.clientY, accX: 0 };
        return;
      }
      if (event.button !== 0) return;
      if (commenting && save) {
        setCommenting(false);
        placeComment(save, { x: nx, y: ny });
        return;
      }
      if (cropping) {
        cropStart.current = { x: nx, y: ny };
        setDraftCrop({ x: nx, y: ny, w: 0.05, h: 0.05 });
        return;
      }
      if (zoom > 1) leftDrag.current = { x: event.clientX, y: event.clientY };
    },
    [commenting, cropping, save, spaceOpen, zoom],
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!spaceOpen) return;
      if (rightDrag.current) {
        const dy = event.clientY - rightDrag.current.y;
        const dx = event.clientX - rightDrag.current.x;
        rightDrag.current = {
          x: event.clientX,
          y: event.clientY,
          accX: rightDrag.current.accX + dx,
        };
        if (Math.abs(dy) >= Math.abs(dx)) {
          setZoom((value) => Math.min(8, Math.max(1, value - dy * 0.01)));
        }
        return;
      }
      if (cropping && cropStart.current) {
        const rect = event.currentTarget.getBoundingClientRect();
        const nx = (event.clientX - rect.left) / rect.width;
        const ny = (event.clientY - rect.top) / rect.height;
        const x = Math.min(cropStart.current.x, nx);
        const y = Math.min(cropStart.current.y, ny);
        setDraftCrop(
          clampCrop({
            x,
            y,
            w: Math.abs(nx - cropStart.current.x),
            h: Math.abs(ny - cropStart.current.y),
          }),
        );
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
    },
    [cropping, spaceOpen],
  );

  const onPointerUp = useCallback(() => {
    if (rightDrag.current && save) {
      const step = Math.round(rightDrag.current.accX / 80);
      if (step !== 0) {
        const next = adjacentVisibleSaveId(save.id, step > 0 ? 1 : -1);
        if (next) selectOnlySave(next);
      }
    }
    if (cropStart.current && draftCrop && save) {
      void applyInspect(
        save.id,
        cropPatch(clampCrop(draftCrop)),
        "inspect:crop",
      );
      setCropping(false);
      setDraftCrop(null);
    }
    rightDrag.current = null;
    leftDrag.current = null;
    cropStart.current = null;
  }, [draftCrop, save]);

  if (compare && compareA && compareB) {
    return (
      <div
        className={styles.root}
        data-interactive
        role="dialog"
        aria-label="Compare Saves"
      >
        <div className={styles.compare}>
          <div className={styles.frame} data-grayscale={grayscale || undefined}>
            <CardThumb save={compareA} />
          </div>
          <div className={styles.frame} data-grayscale={grayscale || undefined}>
            <CardThumb save={compareB} />
          </div>
        </div>
      </div>
    );
  }

  if (!id || !save) return null;

  return (
    <div
      className={styles.root}
      data-interactive={spaceOpen || undefined}
      role="dialog"
      aria-label={spaceOpen ? "Preview Save" : "Hover Preview"}
      onWheel={onWheel}
    >
      {/* biome-ignore lint/a11y/noStaticElementInteractions: pan, zoom, and drag surface */}
      <div
        className={styles.frame}
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: `${origin.x}% ${origin.y}%`,
        }}
        draggable={spaceOpen && !cropping && !commenting}
        onContextMenu={onContext}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onDragStart={(event) => {
          event.preventDefault();
          startNativeDrag(save.id);
        }}
      >
        <div
          style={mediaTransformStyle(save)}
          className={styles.media}
          data-grayscale={grayscale || undefined}
        >
          <CardThumb save={save} />
        </div>
        {draftCrop ? (
          <div
            className={styles.crop}
            style={{
              left: `${draftCrop.x * 100}%`,
              top: `${draftCrop.y * 100}%`,
              width: `${draftCrop.w * 100}%`,
              height: `${draftCrop.h * 100}%`,
            }}
          />
        ) : null}
      </div>
      {spaceOpen ? (
        <div className={styles.tools}>
          <Button
            size="xs"
            variant="secondary"
            onClick={() =>
              void applyInspect(
                save.id,
                rotatePatch(save, -90),
                "inspect:rotate",
              )
            }
          >
            Rotate Left
          </Button>
          <Button
            size="xs"
            variant="secondary"
            onClick={() =>
              void applyInspect(
                save.id,
                rotatePatch(save, 90),
                "inspect:rotate",
              )
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
            variant={cropping ? "primary" : "secondary"}
            onClick={() => {
              setCommenting(false);
              setCropping((value) => !value);
            }}
          >
            Crop
          </Button>
          <Button
            size="xs"
            variant={commenting ? "primary" : "secondary"}
            onClick={() => {
              setCropping(false);
              setCommenting((value) => !value);
            }}
          >
            Comment
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
          <Button
            size="xs"
            variant="secondary"
            onClick={() => inspect.pinCurrent()}
          >
            Pin on Top
          </Button>
          {selectedCount >= 2 ? (
            <Button
              size="xs"
              variant="secondary"
              onClick={() => inspect.toggleCompare()}
            >
              Compare
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
