import type { ImageCrop } from "@pond/schema/db";
import {
  type Dispatch,
  type RefObject,
  type SetStateAction,
  useEffect,
  useRef,
} from "react";
import { containImage, nudgeCrop } from "@/features/saves/lib/image-regions";
import type { InspectorMode } from "./types";

type CropDelta = readonly [number, number, number, number];

interface CropKeyboardOptions {
  active: boolean;
  draft: ImageCrop | null;
  frame: RefObject<HTMLDivElement | null>;
  mode: InspectorMode;
  onApply: () => void;
  ratio: number | null;
  setDraft: Dispatch<SetStateAction<ImageCrop | null>>;
  setMode: Dispatch<SetStateAction<InspectorMode>>;
}

export function useCropKeyboard({
  active,
  draft,
  frame,
  mode,
  onApply,
  ratio,
  setDraft,
  setMode,
}: CropKeyboardOptions): void {
  const applyRef = useRef(onApply);
  applyRef.current = onApply;

  useEffect(() => {
    if (!active || mode !== "crop" || !draft) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Enter") {
        event.preventDefault();
        applyRef.current();
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        setMode("view");
        setDraft(null);
        return;
      }
      const step = event.shiftKey ? 10 : 1;
      const bounds = containImage(
        frame.current?.getBoundingClientRect() ?? {
          left: 0,
          top: 0,
          width: 0,
          height: 0,
        },
        ratio,
      );
      const px = bounds.width ? step / bounds.width : 0;
      const py = bounds.height ? step / bounds.height : 0;
      const resize = event.metaKey || event.ctrlKey;
      const delta: CropDelta | null =
        event.key === "ArrowLeft"
          ? resize
            ? [0, 0, -px, 0]
            : [-px, 0, 0, 0]
          : event.key === "ArrowRight"
            ? resize
              ? [0, 0, px, 0]
              : [px, 0, 0, 0]
            : event.key === "ArrowUp"
              ? resize
                ? [0, 0, 0, -py]
                : [0, -py, 0, 0]
              : event.key === "ArrowDown"
                ? resize
                  ? [0, 0, 0, py]
                  : [0, py, 0, 0]
                : null;
      if (!delta) return;
      event.preventDefault();
      const [dx, dy, dw, dh] = delta;
      setDraft((current) =>
        current ? nudgeCrop(current, dx, dy, dw, dh) : current,
      );
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, draft, frame, mode, ratio, setDraft, setMode]);
}
