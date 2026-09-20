import type { ImageComment, ImageCrop } from "@pond/schema/db";
import { Dialog } from "@pond/ui";
import { type CSSProperties, useEffect, useRef, useState } from "react";
import { CommentEditor } from "@/features/saves/components/annotations/comment-editor";
import { useGifPlayer } from "@/features/saves/hooks/use-gif-player";
import {
  applyInspect,
  cropPatch,
  flipPatch,
  resetTransformPatch,
  rotatePatch,
} from "@/features/saves/lib/inspect-actions";
import { mediaTransformStyle } from "@/features/saves/lib/media-transform";
import { beginSaveDrag } from "@/features/saves/lib/start-drag";
import {
  actualSizeZoom,
  FIT_POSE,
  zoomImageAt,
} from "@/features/saves/lib/viewer-memory";
import { inspect, useInspect } from "@/features/saves/state/inspect";
import { resultNavigation } from "@/features/saves/state/result-navigation";
import type { Save } from "@/features/saves/types";
import { usePrefs } from "@/features/settings/state/prefs";
import { notify } from "@/shared/lib/toast";
import { ImageControls } from "./controls";
import { createImageGestures, type ImageDrag } from "./image-gestures";
import { Navigator } from "./navigator";
import { ImageOverlay } from "./overlay";
import styles from "./styles.module.css";
import type { InspectorMode } from "./types";
import { useCropKeyboard } from "./use-crop-keyboard";
import { useImageViewport } from "./use-image-viewport";

interface AnnotationStyle extends CSSProperties {
  "--marker-scale": number;
  "--marker-rotate": number;
  "--marker-flip-x": number;
  "--marker-flip-y": number;
}

interface ImageInspectorProps {
  save: Save;
  fileIndex?: number;
  src: string;
  active: boolean;
  onRatio: (ratio: number) => void;
  onError: () => void;
  onNavigate?: (id: string) => void;
}

export function ImageInspector({
  save,
  fileIndex = 0,
  src,
  active,
  onRatio,
  onError,
  onNavigate,
}: ImageInspectorProps) {
  const [prefs] = usePrefs("viewer");
  const { grayscale, showNavigator, commentRequest } = useInspect();
  const file = save.files[fileIndex];
  const isGif =
    file?.mimeType === "image/gif" ||
    /\.gif(?:$|[?#])/i.test(file?.path ?? src);
  const [mode, setMode] = useState<InspectorMode>("view");
  const [transformMode, setTransformMode] = useState<"preview" | "file">(
    "preview",
  );
  const [editingComment, setEditingComment] = useState<{
    comment: ImageComment;
    creating: boolean;
  } | null>(null);
  const [pinEl, setPinEl] = useState<HTMLElement | null>(null);
  const [draft, setDraft] = useState<ImageCrop | null>(null);
  const [busy, setBusy] = useState(false);
  const drag = useRef<ImageDrag | null>(null);
  const lastNavigate = useRef(0);
  const gestureMoved = useRef(false);
  const pending = useRef(false);
  const gif = useGifPlayer(
    src,
    isGif,
    active && mode === "view",
    prefs.gifAutoplay !== false,
  );

  const navigate = (delta: number) => {
    if (!onNavigate || Date.now() - lastNavigate.current < 200) return;
    lastNavigate.current = Date.now();
    void resultNavigation
      .next(save.id, delta)
      .then((next) => {
        if (next) onNavigate(next);
      })
      .catch(() => {});
  };
  const viewport = useImageViewport({
    active,
    defaultSize: prefs.defaultImageSize,
    initialRatio:
      file?.width && file.height
        ? file.width / file.height
        : save.width && save.height
          ? save.width / save.height
          : null,
    isDragging: () => drag.current !== null,
    mode,
    naturalWidth: file?.width || save.width || 0,
    onNavigate: navigate,
    onRatio,
    rememberPosition: prefs.rememberImagePosition !== false,
    src,
    wheelBehavior: prefs.wheelBehavior,
  });

  const run = async (action: () => Promise<void>) => {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    try {
      await action();
    } catch (error) {
      notify({
        id: "image-inspection",
        title: "Couldn't update this image",
        description: error instanceof Error ? error.message : "Try again.",
      });
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };
  const toggleMode = (next: "crop" | "comment") => {
    setMode((previous) => (previous === next ? "view" : next));
    setDraft(null);
    setEditingComment(null);
    if (next === "crop") viewport.setPosition(() => FIT_POSE);
  };
  const applyToFile = (
    transform: {
      rotate?: 0 | 90 | 180 | 270;
      flipX?: boolean;
      flipY?: boolean;
      crop?: ImageCrop | null;
    },
    onApplied?: () => void,
  ) => {
    Dialog.confirm({
      title: "Apply Transform to File",
      description:
        "Pond replaces the original image. You can use Undo to restore it.",
      confirmLabel: "Apply to File",
      onConfirm: () =>
        run(async () => {
          await window.pond.query("saves.applyImageTransform", {
            id: save.id,
            fileIndex,
            ...transform,
          });
          onApplied?.();
        }),
    });
  };
  const openWindow = (kind: "presentation" | "detached") => {
    void window.pond
      .openPreviewWindow({ saveId: save.id, fileIndex, kind })
      .catch((error) =>
        notify({
          id: "preview-window",
          title: "Couldn’t open this image",
          description: error instanceof Error ? error.message : "Try again.",
        }),
      );
  };
  const actualSize = () => {
    const one = actualSizeZoom(
      viewport.image.current?.naturalWidth ?? 0,
      viewport.frame.current?.clientWidth ?? 0,
    );
    if (one)
      viewport.setPosition(() => ({
        zoom: Math.min(32, one),
        x: 0,
        y: 0,
      }));
  };
  const zoomOut = () =>
    viewport.setPosition((previous) =>
      zoomImageAt(previous, previous.zoom / 1.25, { x: 0, y: 0 }),
    );
  const zoomIn = () =>
    viewport.setPosition((previous) =>
      zoomImageAt(previous, previous.zoom * 1.25, { x: 0, y: 0 }),
    );

  useEffect(() => {
    if (!active || commentRequest === 0) return;
    setMode("comment");
    setDraft(null);
    setEditingComment(null);
  }, [active, commentRequest]);
  useEffect(() => {
    if (!active || mode !== "comment" || editingComment) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setMode("view");
      setDraft(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, editingComment, mode]);

  const applyCrop = () => {
    if (!draft) return;
    if (transformMode === "file") {
      applyToFile({ crop: draft }, () => {
        setDraft(null);
        setMode("view");
      });
      return;
    }
    void run(async () => {
      await applyInspect(save.id, cropPatch(draft), "inspect:crop");
      setDraft(null);
      setMode("view");
    });
  };
  useCropKeyboard({
    active,
    draft,
    frame: viewport.frame,
    mode,
    onApply: applyCrop,
    ratio: viewport.ratio,
    setDraft,
    setMode,
  });
  const saveCrop = () => {
    if (!draft) return;
    void run(async () => {
      const result = await window.pond.query("saves.cropAsCopy", {
        id: save.id,
        fileIndex,
        crop: draft,
        frameIndex: isGif ? gif.frameIndex : undefined,
      });
      if (!result.ok) throw new Error(result.error);
      setDraft(null);
      setMode("view");
      notify({ id: "image-crop-copy", title: "Crop saved as a new image" });
    });
  };

  const placedComments = (save.comments ?? []).filter(
    (comment) => (comment.fileIndex ?? 0) === fileIndex,
  );
  const overlayComments: ImageComment[] = (() => {
    if (mode !== "comment" || !draft) return placedComments;
    const next = {
      ...(editingComment?.comment ?? {
        id: "draft",
        text: "",
        fileIndex,
      }),
      ...draft,
    };
    if (placedComments.some((comment) => comment.id === next.id))
      return placedComments.map((comment) =>
        comment.id === next.id ? next : comment,
      );
    return [...placedComments, next];
  })();

  const imageStyle: CSSProperties =
    mode === "view" ? mediaTransformStyle(save) : { transform: "none" };
  imageStyle.imageRendering =
    prefs.imageRendering === "pixelated" ? "pixelated" : "auto";
  if (grayscale) imageStyle.filter = "grayscale(1)";
  const annotationStyle = {
    ...(mode === "view" ? mediaTransformStyle(save) : null),
    "--marker-scale": 1 / viewport.pose.zoom,
    "--marker-rotate": save.rotate ?? 0,
    "--marker-flip-x": save.flipX ? -1 : 1,
    "--marker-flip-y": save.flipY ? -1 : 1,
  } satisfies AnnotationStyle;
  const gestures = createImageGestures({
    active,
    draft,
    drag,
    editingComment: editingComment !== null,
    gestureMoved,
    mode,
    onComment: (region) => {
      setDraft(region);
      setEditingComment({
        creating: true,
        comment: {
          id: crypto.randomUUID(),
          ...region,
          text: "",
          fileIndex,
          createdAt: Date.now(),
        },
      });
    },
    onNavigate: navigate,
    pointFromClient: viewport.pointFromClient,
    poseZoom: viewport.pose.zoom,
    ratio: viewport.ratio,
    setDraft,
    setPosition: viewport.setPosition,
  });

  return (
    <div
      className={styles.root}
      data-active={active || undefined}
      data-gif-player={gif.ready || undefined}
    >
      <div
        ref={viewport.frame}
        className={styles.frame}
        role="application"
        aria-label="Image"
        data-background={prefs.transparentBackground ?? "none"}
        data-commenting={mode === "comment" || undefined}
        {...gestures}
      >
        <div
          className={styles.position}
          data-live={viewport.live || undefined}
          style={{
            transform: `translate(${viewport.pose.x}px, ${viewport.pose.y}px) scale(${viewport.pose.zoom})`,
          }}
        >
          <div
            className={styles.content}
            style={
              viewport.size.width && viewport.size.height
                ? {
                    left: viewport.bounds.left,
                    top: viewport.bounds.top,
                    width: viewport.bounds.width,
                    height: viewport.bounds.height,
                  }
                : undefined
            }
          >
            <img
              ref={(element) => {
                viewport.image.current = element;
                if (element?.complete && element.naturalWidth)
                  viewport.reportRatio(
                    element.naturalWidth / element.naturalHeight,
                  );
              }}
              src={src}
              alt={save.title ?? ""}
              className={styles.image}
              decoding="async"
              fetchPriority={active ? "high" : "low"}
              style={{ ...imageStyle, display: gif.ready ? "none" : undefined }}
              draggable={mode === "view" && viewport.pose.zoom <= 1}
              onDragStart={(event) => {
                beginSaveDrag(save.id, event.dataTransfer);
              }}
              onLoad={(event) =>
                viewport.reportRatio(
                  event.currentTarget.naturalWidth /
                    event.currentTarget.naturalHeight,
                )
              }
              onError={onError}
            />
            {isGif ? (
              <canvas
                ref={gif.canvas}
                className={styles.image}
                data-frame={gif.frameIndex}
                style={{ ...imageStyle, display: gif.ready ? "block" : "none" }}
                aria-label={`${save.title || "GIF"}, frame ${gif.frameIndex + 1}`}
              />
            ) : null}
            <ImageOverlay
              active={active}
              annotationStyle={annotationStyle}
              comments={overlayComments}
              draft={draft}
              editingComment={editingComment}
              mode={mode}
              onEditComment={(comment) => {
                setDraft({
                  x: comment.x,
                  y: comment.y,
                  w: comment.w,
                  h: comment.h,
                });
                setEditingComment({ comment, creating: false });
              }}
              onPinElement={setPinEl}
            />
          </div>
        </div>
        {showNavigator && viewport.size.width > 0 ? (
          <Navigator
            src={src}
            pose={viewport.pose}
            stage={{
              width: viewport.frame.current?.clientWidth ?? 1,
              height: viewport.frame.current?.clientHeight ?? 1,
            }}
            onPose={(next) => viewport.setPosition(() => next, true)}
          />
        ) : null}
      </div>
      {editingComment && pinEl ? (
        <CommentEditor
          key={editingComment.comment.id}
          saveId={save.id}
          comment={{ ...editingComment.comment, ...draft }}
          creating={editingComment.creating}
          anchor={pinEl}
          onClose={() => {
            setEditingComment(null);
            setDraft(null);
          }}
        />
      ) : null}
      <ImageControls.Hud
        actual={viewport.actual}
        active={active}
        busy={busy}
        canCrop={!!draft && draft.w > 0 && draft.h > 0}
        grayscale={grayscale}
        mode={mode}
        transformMode={transformMode}
        onActualSize={actualSize}
        onApplyCrop={applyCrop}
        onCancelCrop={() => {
          setMode("view");
          setDraft(null);
        }}
        onDetach={() => openWindow("detached")}
        onFit={() => viewport.setPosition(() => FIT_POSE)}
        onFlip={() =>
          transformMode === "file"
            ? applyToFile({ flipX: true })
            : void run(() =>
                applyInspect(save.id, flipPatch(save, "x"), "inspect:flip"),
              )
        }
        onReset={() =>
          void run(() =>
            applyInspect(save.id, resetTransformPatch(), "inspect:reset"),
          )
        }
        onPresent={() => openWindow("presentation")}
        onRotate={() =>
          transformMode === "file"
            ? applyToFile({ rotate: 90 })
            : void run(() =>
                applyInspect(save.id, rotatePatch(save, 90), "inspect:rotate"),
              )
        }
        onSaveCrop={saveCrop}
        onToggleComment={() => toggleMode("comment")}
        onToggleCrop={() => toggleMode("crop")}
        onToggleGrayscale={() => inspect.toggleGrayscale()}
        onTransformModeChange={setTransformMode}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
      />
      <ImageControls.Gif active={active} gif={gif} mode={mode} />
    </div>
  );
}
