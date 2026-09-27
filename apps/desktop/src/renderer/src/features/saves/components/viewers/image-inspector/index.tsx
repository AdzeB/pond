import type { ImageComment, ImageCrop } from "@pond/schema/db";
import {
  type CSSProperties,
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { CommentEditor } from "@/features/saves/components/annotations/comment-editor";
import type { ViewerNavigation } from "@/features/saves/components/viewers/viewer-toolbar-groups";
import { useGifPlayer } from "@/features/saves/hooks/use-gif-player";
import {
  applyInspect,
  cropPatch,
  flipPatch,
  rotatePatch,
} from "@/features/saves/lib/inspect-actions";
import { mediaTransformStyle } from "@/features/saves/lib/media-transform";
import { beginSaveDrag } from "@/features/saves/lib/start-drag";
import { FIT_POSE, zoomImageAt } from "@/features/saves/lib/viewer-memory";
import { useInspect } from "@/features/saves/state/inspect";
import {
  resultNavigation,
  useResultIndex,
  useResultTotal,
} from "@/features/saves/state/result-navigation";
import type { Save } from "@/features/saves/types";
import { usePrefs } from "@/features/settings/state/prefs";
import { notify } from "@/shared/lib/toast";
import { ImageControls } from "./controls";
import { GifContextMenu } from "./gif-menu";
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
  edits?: "full" | "none";
  endActions?: ReactNode;
  slideNavigation?: ViewerNavigation;
}

export function ImageInspector({
  save,
  fileIndex = 0,
  src,
  active,
  onRatio,
  onError,
  onNavigate,
  edits = "full",
  endActions,
  slideNavigation,
}: ImageInspectorProps) {
  const [prefs] = usePrefs("viewer");
  const itemIndex = useResultIndex(save.id);
  const itemTotal = useResultTotal();
  const instructionsId = useId();
  const { grayscale, showNavigator, commentRequest } = useInspect();
  const file = save.files[fileIndex];
  const isGif =
    file?.mimeType === "image/gif" ||
    /\.gif(?:$|[?#])/i.test(file?.path ?? src);
  const [mode, setMode] = useState<InspectorMode>("view");
  const [gifFramesOpen, setGifFramesOpen] = useState(false);
  const [editingComment, setEditingComment] = useState<{
    comment: ImageComment;
    creating: boolean;
  } | null>(null);
  const [pinEl, setPinEl] = useState<HTMLElement | null>(null);
  const [draft, setDraft] = useState<ImageCrop | null>(null);
  const [busy, setBusy] = useState(false);
  const drag = useRef<ImageDrag | null>(null);
  const lastNavigate = useRef(0);
  const lastCommentRequest = useRef(0);
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
  const actualSize = () => {
    const one = viewport.oneToOne;
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
  const setZoomRatio = (ratio: number) => {
    const one = viewport.oneToOne;
    if (!one) return;
    viewport.setPosition((previous) =>
      zoomImageAt(previous, Math.min(32, ratio * one), { x: 0, y: 0 }),
    );
  };
  const setGifThumbnail = () => {
    void window.pond
      .query("saves.setGifThumbnail", {
        id: save.id,
        src,
        frameIndex: gif.frameIndex,
      })
      .then((result) => {
        if (!result.ok)
          notify({
            id: "gif-thumb",
            title: "Couldn't set this GIF frame as the thumbnail.",
          });
      });
  };

  useEffect(() => {
    if (
      !active ||
      !commentRequest ||
      commentRequest.saveId !== save.id ||
      commentRequest.fileIndex !== fileIndex ||
      commentRequest.revision <= lastCommentRequest.current
    )
      return;
    lastCommentRequest.current = commentRequest.revision;
    if (commentRequest.commentId === null) {
      setMode("comment");
      setDraft(null);
      setEditingComment(null);
      return;
    }
    const comment = (save.comments ?? []).find(
      (candidate) =>
        candidate.id === commentRequest.commentId &&
        candidate.resolvedAt == null,
    );
    if (!comment) return;
    setMode("view");
    setPinEl(null);
    setDraft({ x: comment.x, y: comment.y, w: comment.w, h: comment.h });
    setEditingComment({ comment, creating: false });
  }, [active, commentRequest, fileIndex, save.comments, save.id]);

  const applyCrop = () => {
    if (!draft) return;
    void run(async () => {
      await applyInspect(save.id, cropPatch(draft), "inspect:crop");
      setDraft(null);
      setMode("view");
    });
  };
  useCropKeyboard({
    active: active && edits === "full",
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
    (comment) =>
      comment.resolvedAt == null && (comment.fileIndex ?? 0) === fileIndex,
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
  const createComment = (region: ImageCrop) => {
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
  };
  useEffect(() => {
    if (active && mode !== "view" && !editingComment)
      viewport.frame.current?.focus();
  }, [active, mode, editingComment, viewport.frame]);
  const gestures = createImageGestures({
    active,
    draft,
    drag,
    editingComment: editingComment !== null,
    gestureMoved,
    mode,
    onComment: createComment,
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
      <span id={instructionsId} className={styles.instructions}>
        {mode === "comment"
          ? "Comment placement. Arrow keys move, Alt and arrow keys resize, Shift increases the step. Enter adds a comment. Escape cancels."
          : mode === "crop"
            ? "Crop. Arrow keys move the selection, Control or Command and arrow keys resize, Shift increases the step. Enter applies the crop. Escape cancels."
            : "Arrow keys pan. Plus and minus zoom."}
      </span>
      <div
        ref={viewport.frame}
        className={styles.frame}
        role="application"
        aria-label="Image"
        aria-describedby={instructionsId}
        tabIndex={active ? 0 : -1}
        onKeyDown={(event) => {
          if (
            event.target !== event.currentTarget ||
            event.nativeEvent.isComposing
          )
            return;
          const direction = {
            ArrowLeft: [-1, 0],
            ArrowRight: [1, 0],
            ArrowUp: [0, -1],
            ArrowDown: [0, 1],
          }[event.key];
          if (mode === "comment" && !editingComment) {
            if (event.key === "Escape") {
              event.preventDefault();
              event.stopPropagation();
              setMode("view");
              setDraft(null);
            } else if (event.key === "Enter") {
              event.preventDefault();
              event.stopPropagation();
              createComment(draft ?? { x: 0.49, y: 0.49, w: 0.02, h: 0.02 });
            } else if (direction) {
              event.preventDefault();
              event.stopPropagation();
              const step = event.shiftKey ? 0.1 : 0.01;
              setDraft((previous) => {
                const region = previous ?? {
                  x: 0.49,
                  y: 0.49,
                  w: 0.02,
                  h: 0.02,
                };
                const dx = (direction[0] ?? 0) * step;
                const dy = (direction[1] ?? 0) * step;
                return event.altKey
                  ? {
                      ...region,
                      w: Math.max(0.01, Math.min(1 - region.x, region.w + dx)),
                      h: Math.max(0.01, Math.min(1 - region.y, region.h + dy)),
                    }
                  : {
                      ...region,
                      x: Math.max(0, Math.min(1 - region.w, region.x + dx)),
                      y: Math.max(0, Math.min(1 - region.h, region.y + dy)),
                    };
              });
            }
          } else if (
            mode === "view" &&
            (direction || ["+", "=", "-"].includes(event.key))
          ) {
            event.preventDefault();
            event.stopPropagation();
            if (direction)
              viewport.setPosition((previous) => ({
                ...previous,
                x:
                  previous.x -
                  (direction[0] ?? 0) * (event.shiftKey ? 100 : 20),
                y:
                  previous.y -
                  (direction[1] ?? 0) * (event.shiftKey ? 100 : 20),
              }));
            else if (event.key === "-") zoomOut();
            else zoomIn();
          }
        }}
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
                  viewport.reportImage(
                    element.naturalWidth,
                    element.naturalHeight,
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
                viewport.reportImage(
                  event.currentTarget.naturalWidth,
                  event.currentTarget.naturalHeight,
                )
              }
              onError={onError}
            />
            {isGif ? (
              <GifContextMenu
                hasLoop={gif.loop !== null}
                onResetLoop={gif.resetLoop}
                onSetThumbnail={setGifThumbnail}
              >
                <canvas
                  ref={gif.canvas}
                  className={styles.image}
                  data-frame={gif.frameIndex}
                  style={{
                    ...imageStyle,
                    display: gif.ready ? "block" : "none",
                  }}
                  aria-label={`${save.title || "GIF"}, frame ${gif.frameIndex + 1}`}
                />
              </GifContextMenu>
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
            bounds={viewport.bounds}
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
        mode={mode}
        edits={edits}
        endActions={endActions}
        slideNavigation={slideNavigation}
        itemIndex={itemIndex}
        itemTotal={itemTotal}
        isGif={isGif}
        gifFramesOpen={gifFramesOpen}
        onActualSize={actualSize}
        onApplyCrop={applyCrop}
        onCancelCrop={() => {
          setMode("view");
          setDraft(null);
        }}
        onFit={() => viewport.setPosition(() => FIT_POSE)}
        onFlip={() =>
          void run(() =>
            applyInspect(save.id, flipPatch(save, "x"), "inspect:flip"),
          )
        }
        onRotate={() =>
          void run(() =>
            applyInspect(save.id, rotatePatch(save, 90), "inspect:rotate"),
          )
        }
        onSaveCrop={saveCrop}
        onToggleComment={() => toggleMode("comment")}
        onToggleCrop={() => toggleMode("crop")}
        onToggleGifFrames={() => setGifFramesOpen((value) => !value)}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onZoomRatio={setZoomRatio}
      />
      <ImageControls.Gif
        active={active && gifFramesOpen}
        gif={gif}
        mode={mode}
      />
    </div>
  );
}
