import {
  IconContrastFill18,
  IconCropFill18,
  IconExpandFill18,
  IconFlipHorizontal2Fill18,
  IconMediaFastBackwardsFill18,
  IconMediaFastForwardFill18,
  IconMediaPauseFill18,
  IconMediaPlayFill18,
  IconMinusFill18,
  IconPencilFill18,
  IconPlusFill18,
  IconRefreshFill18,
  IconRotateImageClockwiseFill18,
} from "@pond/icons/fill/18";
import { IconSizeLgOutline18 } from "@pond/icons/outline/18";
import type { ImageComment, ImageCrop } from "@pond/schema/db";
import { Button, stepPlaybackRate, Tray } from "@pond/ui";
import { useHotkey } from "@tanstack/react-hotkeys";
import { type CSSProperties, useEffect, useRef, useState } from "react";
import { resultNavigation } from "@/features/library/state/result-navigation";
import { CommentEditor } from "@/features/saves/components/annotations/comment-editor";
import { ViewerHud } from "@/features/saves/components/viewers/hud";
import { useGifPlayer } from "@/features/saves/hooks/use-gif-player";
import { clampGifFrame } from "@/features/saves/lib/gif-loop";
import {
  CROP_HANDLES,
  type CropHandle,
  clampImagePoint,
  commentFromGesture,
  containImage,
  cropContains,
  inImage,
  isAreaComment,
  lockCropAspect,
  nudgeCrop,
  resizeCrop,
  viewToImagePoint,
} from "@/features/saves/lib/image-regions";
import {
  applyInspect,
  cropPatch,
  flipPatch,
  resetTransformPatch,
  rotatePatch,
} from "@/features/saves/lib/inspect-actions";
import { mediaTransformStyle } from "@/features/saves/lib/media-transform";
import { startNativeDrag } from "@/features/saves/lib/start-drag";
import {
  actualSizeZoom,
  FIT_POSE,
  type ImagePose,
  poseToActual,
  viewerMemory,
  viewerWheelIntent,
  wheelZoomFactor,
  zoomImageAt,
} from "@/features/saves/lib/viewer-memory";
import { inspect, useInspect } from "@/features/saves/state/inspect";
import type { Save } from "@/features/saves/types";
import { usePrefs } from "@/features/settings/state/prefs";
import { ShortcutKeys } from "@/shared/components/shortcut-keys/shortcut-keys";
import { useShortcutBindings } from "@/shared/lib/shortcuts";
import { notify } from "@/shared/lib/toast";
import styles from "./image-inspector.module.css";
import { Navigator } from "./navigator";

export function ImageInspector({
  save,
  fileIndex = 0,
  src,
  active,
  onRatio,
  onError,
  onNavigate,
}: {
  save: Save;
  fileIndex?: number;
  src: string;
  active: boolean;
  onRatio: (ratio: number) => void;
  onError: () => void;
  onNavigate?: (id: string) => void;
}) {
  const [prefs] = usePrefs("viewer");
  const { grayscale, showNavigator, commentRequest } = useInspect();
  const file = save.files[fileIndex];
  const isGif =
    file?.mimeType === "image/gif" ||
    /\.gif(?:$|[?#])/i.test(file?.path ?? src);

  const [pose, setPose] = useState<ImagePose>(() => viewerMemory.image(src));
  const [live, setLive] = useState(false);
  const [mode, setMode] = useState<"view" | "crop" | "comment">("view");
  const gif = useGifPlayer(src, isGif, active && mode === "view");
  const shortcuts = useShortcutBindings();
  const gifHotkeys = {
    enabled: active && gif.ready && mode === "view",
    ignoreInputs: true,
  };
  useHotkey(shortcuts["viewer.play-pause"].keys!, gif.toggle, gifHotkeys);
  useHotkey(
    shortcuts["viewer.frame-prev"].keys!,
    () => gif.seek(gif.frameIndex - 1),
    gifHotkeys,
  );
  useHotkey(
    shortcuts["viewer.frame-next"].keys!,
    () => gif.seek(gif.frameIndex + 1),
    gifHotkeys,
  );
  useHotkey(
    shortcuts["viewer.frame-prev-ten"].keys!,
    () => gif.seek(gif.frameIndex - 10),
    gifHotkeys,
  );
  useHotkey(
    shortcuts["viewer.frame-next-ten"].keys!,
    () => gif.seek(gif.frameIndex + 10),
    gifHotkeys,
  );
  useHotkey(
    shortcuts["viewer.speed-up"].keys!,
    () => gif.setRate(stepPlaybackRate(gif.rate, 1)),
    gifHotkeys,
  );
  useHotkey(
    shortcuts["viewer.speed-down"].keys!,
    () => gif.setRate(stepPlaybackRate(gif.rate, -1)),
    gifHotkeys,
  );
  const actualSize = () => {
    const one = actualSizeZoom(
      image.current?.naturalWidth ?? 0,
      frame.current?.clientWidth ?? 0,
    );
    if (one)
      setPosition(() => ({
        zoom: Math.min(32, one),
        x: 0,
        y: 0,
      }));
  };
  useHotkey(
    shortcuts["viewer.zoom-fit"].keys!,
    () => setPosition(() => FIT_POSE),
    {
      enabled: active && mode === "view",
      ignoreInputs: true,
    },
  );
  useHotkey(shortcuts["viewer.actual-size"].keys!, actualSize, {
    enabled: active && mode === "view",
    ignoreInputs: true,
  });
  const [editingComment, setEditingComment] = useState<{
    comment: ImageComment;
    creating: boolean;
  } | null>(null);
  const [pinEl, setPinEl] = useState<HTMLElement | null>(null);
  const [ratio, setRatio] = useState<number | null>(
    file?.width && file.height
      ? file.width / file.height
      : save.width && save.height
        ? save.width / save.height
        : null,
  );
  const [size, setSize] = useState({ width: 0, height: 0 });
  const bounds = containImage({ left: 0, top: 0, ...size }, ratio);
  const [draft, setDraft] = useState<ImageCrop | null>(null);
  const [busy, setBusy] = useState(false);
  const frame = useRef<HTMLDivElement>(null);
  const image = useRef<HTMLImageElement>(null);
  const drag = useRef<{
    button: number;
    x: number;
    y: number;
    startX: number;
    startY: number;
    cropX: number;
    cropY: number;
    crop?: ImageCrop;
    handle?: CropHandle;
  } | null>(null);
  const lastNavigate = useRef(0);
  const gestureMoved = useRef(false);
  const pending = useRef(false);
  const latestPose = useRef(pose);
  const poseFrame = useRef(0);
  const setPosition = (
    update: (previous: ImagePose) => ImagePose,
    live = false,
  ) => {
    if (poseFrame.current) {
      cancelAnimationFrame(poseFrame.current);
      poseFrame.current = 0;
    }
    const next = update(latestPose.current);
    latestPose.current = next;
    setLive(live);
    setPose(next);
  };
  const queuePose = (update: (previous: ImagePose) => ImagePose) => {
    latestPose.current = update(latestPose.current);
    if (poseFrame.current) return;
    poseFrame.current = requestAnimationFrame(() => {
      poseFrame.current = 0;
      setLive(true);
      setPose(latestPose.current);
    });
  };
  useEffect(() => {
    if (prefs.rememberImagePosition === false) return;
    const timer = window.setTimeout(
      () => viewerMemory.setImage(src, pose),
      150,
    );
    return () => window.clearTimeout(timer);
  }, [pose, prefs.rememberImagePosition, src]);
  useEffect(
    () => () => {
      if (prefs.rememberImagePosition !== false)
        viewerMemory.setImage(src, latestPose.current);
    },
    [prefs.rememberImagePosition, src],
  );
  useEffect(() => {
    if (prefs.rememberImagePosition === false) {
      latestPose.current = FIT_POSE;
      setPose(FIT_POSE);
    }
  }, [prefs.rememberImagePosition]);

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
    if (next === "crop") setPosition(() => FIT_POSE);
  };
  const zoomOut = () =>
    setPosition((previous) =>
      zoomImageAt(previous, previous.zoom / 1.25, { x: 0, y: 0 }),
    );
  const zoomIn = () =>
    setPosition((previous) =>
      zoomImageAt(previous, previous.zoom * 1.25, { x: 0, y: 0 }),
    );
  useHotkey(shortcuts["viewer.comment"].keys!, () => toggleMode("comment"), {
    enabled: active,
    ignoreInputs: true,
  });
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
    void run(async () => {
      await applyInspect(save.id, cropPatch(draft), "inspect:crop");
      setDraft(null);
      setMode("view");
    });
  };
  const applyCropRef = useRef(applyCrop);
  applyCropRef.current = applyCrop;
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
  const pointFromClient = (clientX: number, clientY: number) =>
    viewToImagePoint(
      frame.current?.getBoundingClientRect() ?? {
        left: 0,
        top: 0,
        width: 0,
        height: 0,
      },
      latestPose.current,
      ratio,
      clientX,
      clientY,
    );
  useEffect(() => {
    const element = frame.current;
    if (!element) return;
    const measure = () =>
      setSize({ width: element.clientWidth, height: element.clientHeight });
    measure();
    if (!globalThis.ResizeObserver) return;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const reportRatio = (value: number) => {
    if (Number.isFinite(value) && value > 0) {
      setRatio(value);
      onRatio(value);
    }
  };
  const oneToOne = actualSizeZoom(
    image.current?.naturalWidth || file?.width || save.width || 0,
    size.width,
  );
  const actual = poseToActual(pose.zoom, oneToOne);

  useEffect(() => {
    if (!active || mode !== "crop" || !draft) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Enter") {
        event.preventDefault();
        applyCropRef.current();
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
      const deltas: Record<string, [number, number, number, number]> = {
        ArrowLeft: resize ? [0, 0, -px, 0] : [-px, 0, 0, 0],
        ArrowRight: resize ? [0, 0, px, 0] : [px, 0, 0, 0],
        ArrowUp: resize ? [0, 0, 0, -py] : [0, -py, 0, 0],
        ArrowDown: resize ? [0, 0, 0, py] : [0, py, 0, 0],
      };
      const delta = deltas[event.key];
      if (!delta) return;
      event.preventDefault();
      const [dx, dy, dw, dh] = delta;
      setDraft((current) =>
        current ? nudgeCrop(current, dx, dy, dw, dh) : current,
      );
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, draft, mode, ratio]);

  const wheelState = useRef({
    active,
    mode,
    wheelBehavior: prefs.wheelBehavior,
  });
  wheelState.current = {
    active,
    mode,
    wheelBehavior: prefs.wheelBehavior,
  };
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;
  const queuePoseRef = useRef(queuePose);
  queuePoseRef.current = queuePose;

  useEffect(() => {
    const element = frame.current;
    if (!element) return;
    const onWheel = (event: WheelEvent) => {
      const { active, mode, wheelBehavior } = wheelState.current;
      if (!active || mode === "crop") {
        if (event.ctrlKey) {
          event.preventDefault();
          event.stopPropagation();
        }
        return;
      }
      const intent = viewerWheelIntent({
        ctrlKey: event.ctrlKey,
        altKey: event.altKey,
        metaKey: event.metaKey,
        wheelBehavior,
      });
      event.preventDefault();
      event.stopPropagation();
      if (intent === "navigate") {
        if (mode === "view") navigateRef.current(event.deltaY > 0 ? 1 : -1);
        return;
      }
      if (intent !== "zoom" && drag.current) return;
      const rect = element.getBoundingClientRect();
      if (intent === "zoom") {
        const factor = wheelZoomFactor(
          event.deltaY,
          event.deltaMode,
          event.ctrlKey,
        );
        queuePoseRef.current((previous) =>
          zoomImageAt(previous, previous.zoom * factor, {
            x: event.clientX - rect.left - rect.width / 2,
            y: event.clientY - rect.top - rect.height / 2,
          }),
        );
        return;
      }
      queuePoseRef.current((previous) => ({
        ...previous,
        x: previous.x - event.deltaX,
        y: previous.y - event.deltaY,
      }));
    };
    element.addEventListener("wheel", onWheel, {
      passive: false,
      capture: true,
    });
    return () => {
      element.removeEventListener("wheel", onWheel, { capture: true });
      if (poseFrame.current) {
        cancelAnimationFrame(poseFrame.current);
        poseFrame.current = 0;
      }
    };
  }, []);

  const imageStyle: CSSProperties =
    mode === "view" ? mediaTransformStyle(save) : { transform: "none" };
  imageStyle.imageRendering =
    prefs.imageRendering === "pixelated" ? "pixelated" : "auto";
  if (grayscale) imageStyle.filter = "grayscale(1)";

  return (
    <div
      className={styles.root}
      data-active={active || undefined}
      data-gif-player={gif.ready || undefined}
    >
      <div
        ref={frame}
        className={styles.frame}
        role="application"
        aria-label="Image"
        data-background={prefs.transparentBackground ?? "none"}
        data-commenting={mode === "comment" || undefined}
        onContextMenu={(event) => {
          if (gestureMoved.current) event.preventDefault();
        }}
        onPointerDown={(event) => {
          if (!active) return;
          const handle = cropHandleFromTarget(event.target);
          if (
            event.target instanceof Element &&
            event.target.closest("button") &&
            !handle
          )
            return;
          if (mode !== "view" && event.button !== 0) return;
          if (event.button !== 0 && event.button !== 2) return;
          if (event.button === 0 && mode === "view" && pose.zoom <= 1) return;
          const raw = pointFromClient(event.clientX, event.clientY);
          const point = clampImagePoint(raw);
          const moving =
            (mode === "crop" ||
              (mode === "comment" && !!draft && isAreaComment(draft))) &&
            !handle &&
            !!draft &&
            cropContains(draft, point);
          if (editingComment && mode === "comment" && !handle && !moving)
            return;
          if (mode !== "view" && !handle && !moving && !inImage(raw)) return;
          event.preventDefault();
          event.stopPropagation();
          gestureMoved.current = false;
          event.currentTarget.setPointerCapture(event.pointerId);
          drag.current = {
            button: event.button,
            x: event.clientX,
            y: event.clientY,
            startX: event.clientX,
            startY: event.clientY,
            cropX: point.x,
            cropY: point.y,
            crop: handle || moving ? (draft ?? undefined) : undefined,
            handle: handle ?? undefined,
          };
        }}
        onPointerMove={(event) => {
          const origin = drag.current;
          if (!origin) return;
          event.stopPropagation();
          const dx = event.clientX - origin.x;
          const dy = event.clientY - origin.y;
          if (origin.button === 2) {
            if (
              Math.abs(event.clientX - origin.startX) +
                Math.abs(event.clientY - origin.startY) >
              4
            )
              gestureMoved.current = true;
            if (
              Math.abs(event.clientY - origin.startY) >
              Math.abs(event.clientX - origin.startX)
            )
              setPosition(
                (previous) =>
                  zoomImageAt(previous, previous.zoom * Math.exp(-dy * 0.01), {
                    x: 0,
                    y: 0,
                  }),
                true,
              );
          } else if (mode !== "view") {
            const point = clampImagePoint(
              pointFromClient(event.clientX, event.clientY),
            );
            if (origin.handle && origin.crop) {
              const next = resizeCrop(origin.crop, origin.handle, point);
              setDraft(
                event.shiftKey && ratio ? lockCropAspect(next, ratio) : next,
              );
            } else if (origin.crop) {
              setDraft(
                nudgeCrop(
                  origin.crop,
                  point.x - origin.cropX,
                  point.y - origin.cropY,
                ),
              );
            } else {
              const next = {
                x: Math.min(point.x, origin.cropX),
                y: Math.min(point.y, origin.cropY),
                w: Math.abs(point.x - origin.cropX),
                h: Math.abs(point.y - origin.cropY),
              };
              setDraft(
                mode === "crop" && event.shiftKey && ratio
                  ? lockCropAspect(next, ratio)
                  : next,
              );
            }
          } else
            setPosition(
              (previous) => ({
                ...previous,
                x: previous.x + dx,
                y: previous.y + dy,
              }),
              true,
            );
          origin.x = event.clientX;
          origin.y = event.clientY;
        }}
        onPointerUp={(event) => {
          const origin = drag.current;
          if (
            origin?.button === 2 &&
            Math.abs(event.clientX - origin.startX) > 80 &&
            Math.abs(event.clientX - origin.startX) >
              Math.abs(event.clientY - origin.startY)
          )
            navigate(event.clientX > origin.startX ? -1 : 1);
          if (
            mode === "comment" &&
            origin?.button === 0 &&
            !origin.handle &&
            !origin.crop &&
            !editingComment
          ) {
            const region = commentFromGesture(
              { x: origin.cropX, y: origin.cropY },
              clampImagePoint(pointFromClient(event.clientX, event.clientY)),
            );
            setDraft(region);
            setEditingComment({
              creating: true,
              comment: {
                id: crypto.randomUUID(),
                ...region,
                text: "",
                fileIndex,
              },
            });
          }
          drag.current = null;
          event.stopPropagation();
          if (event.currentTarget.hasPointerCapture(event.pointerId))
            event.currentTarget.releasePointerCapture(event.pointerId);
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
      >
        <div
          className={styles.position}
          data-live={live || undefined}
          style={{
            transform: `translate(${pose.x}px, ${pose.y}px) scale(${pose.zoom})`,
          }}
        >
          <div
            className={styles.content}
            style={
              size.width && size.height
                ? {
                    left: bounds.left,
                    top: bounds.top,
                    width: bounds.width,
                    height: bounds.height,
                  }
                : undefined
            }
          >
            <img
              ref={(element) => {
                image.current = element;
                if (element?.complete && element.naturalWidth)
                  reportRatio(element.naturalWidth / element.naturalHeight);
              }}
              src={src}
              alt={save.title ?? ""}
              className={styles.image}
              decoding="async"
              fetchPriority={active ? "high" : "low"}
              style={{ ...imageStyle, display: gif.ready ? "none" : undefined }}
              draggable={mode === "view" && pose.zoom <= 1}
              onDragStart={(event) => {
                event.preventDefault();
                startNativeDrag(save.id);
              }}
              onLoad={(event) =>
                reportRatio(
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
            {mode !== "crop" ? (
              <div
                className={styles.annotations}
                style={
                  {
                    ...(mode === "view" ? mediaTransformStyle(save) : null),
                    "--marker-scale": 1 / pose.zoom,
                    "--marker-rotate": save.rotate ?? 0,
                    "--marker-flip-x": save.flipX ? -1 : 1,
                    "--marker-flip-y": save.flipY ? -1 : 1,
                  } as CSSProperties
                }
              >
                {overlayComments.map((comment, index) => {
                  const area = isAreaComment(comment);
                  const activePin = editingComment?.comment.id === comment.id;
                  return (
                    <div
                      key={comment.id}
                      className={styles.pin}
                      data-area={area || undefined}
                      data-active={activePin || undefined}
                      style={{
                        left: `${comment.x * 100}%`,
                        top: `${comment.y * 100}%`,
                        width: area ? `${comment.w * 100}%` : undefined,
                        height: area ? `${comment.h * 100}%` : undefined,
                      }}
                    >
                      {area ? <span className={styles.area} /> : null}
                      {activePin && area && mode === "comment"
                        ? CROP_HANDLES.map((handle) => (
                            <button
                              key={handle}
                              type="button"
                              className={styles.handle}
                              data-handle={handle}
                              aria-label={HANDLE_LABEL[handle]}
                              onClick={(event) => event.stopPropagation()}
                            />
                          ))
                        : null}
                      <button
                        type="button"
                        tabIndex={active ? 0 : -1}
                        className={styles.index}
                        aria-label={
                          comment.text
                            ? `Edit comment ${index + 1}: ${comment.text}`
                            : `Comment ${index + 1}`
                        }
                        title={comment.text || undefined}
                        ref={activePin ? setPinEl : undefined}
                        onClick={() => {
                          if (
                            comment.id === "draft" ||
                            editingComment?.creating
                          )
                            return;
                          setDraft({
                            x: comment.x,
                            y: comment.y,
                            w: comment.w,
                            h: comment.h,
                          });
                          setEditingComment({ comment, creating: false });
                        }}
                      >
                        {index + 1}
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : null}
            {draft && mode === "crop" ? (
              <div
                className={styles.selection}
                data-cropping={mode === "crop" || undefined}
                style={{
                  left: `${draft.x * 100}%`,
                  top: `${draft.y * 100}%`,
                  width: `${draft.w * 100}%`,
                  height: `${draft.h * 100}%`,
                }}
              >
                {mode === "crop"
                  ? CROP_HANDLES.map((handle) => (
                      <button
                        key={handle}
                        type="button"
                        className={styles.handle}
                        data-handle={handle}
                        aria-label={HANDLE_LABEL[handle]}
                      />
                    ))
                  : null}
              </div>
            ) : null}
          </div>
        </div>
        {showNavigator && size.width > 0 ? (
          <Navigator
            src={src}
            pose={pose}
            stage={{
              width: frame.current?.clientWidth ?? 1,
              height: frame.current?.clientHeight ?? 1,
            }}
            onPose={(next) => setPosition(() => next, true)}
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
      {active ? (
        <ViewerHud.Root>
          {mode === "crop" ? (
            <ViewerHud.Cluster anchor="bottom-center">
              <Tray.Pill
                className={styles.actions}
                role="toolbar"
                aria-label="Crop"
              >
                <span className={styles.hint}>Select an area to crop</span>
                <Button
                  size="sm"
                  variant="primary"
                  disabled={busy || !draft || draft.w <= 0 || draft.h <= 0}
                  loading={busy}
                  onClick={applyCrop}
                >
                  Apply Crop
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={busy || !draft || draft.w <= 0 || draft.h <= 0}
                  onClick={saveCrop}
                >
                  Save as New Image
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={busy}
                  onClick={() => {
                    setMode("view");
                    setDraft(null);
                  }}
                >
                  Cancel
                </Button>
              </Tray.Pill>
            </ViewerHud.Cluster>
          ) : (
            <>
              <ViewerHud.Cluster anchor="bottom-left">
                {gif.ready && mode === "view" ? (
                  <ViewerHud.Pill role="toolbar" aria-label="GIF Controls">
                    <ViewerHud.Tool
                      label={gif.playing ? "Pause GIF" : "Play GIF"}
                      onClick={gif.toggle}
                    >
                      {gif.playing ? (
                        <IconMediaPauseFill18 />
                      ) : (
                        <IconMediaPlayFill18 />
                      )}
                    </ViewerHud.Tool>
                    <ViewerHud.Tool
                      label="Previous Frame"
                      disabled={
                        gif.frameIndex <=
                        clampGifFrame(
                          gif.loop?.[0] ?? 0,
                          gif.frameCount,
                          gif.loop,
                        )
                      }
                      onClick={() => gif.seek(gif.frameIndex - 1)}
                    >
                      <IconMediaFastBackwardsFill18 />
                    </ViewerHud.Tool>
                    <ViewerHud.Scale>
                      {gif.frameIndex + 1} / {gif.frameCount} · {gif.rate}×
                    </ViewerHud.Scale>
                    <ViewerHud.Tool
                      label="Next Frame"
                      disabled={
                        gif.frameIndex >=
                        clampGifFrame(
                          gif.loop?.[1] ?? gif.frameCount - 1,
                          gif.frameCount,
                          gif.loop,
                        )
                      }
                      onClick={() => gif.seek(gif.frameIndex + 1)}
                    >
                      <IconMediaFastForwardFill18 />
                    </ViewerHud.Tool>
                    <Tray.Separator />
                    <ViewerHud.Tool
                      label="Set Loop Start"
                      onClick={gif.setLoopStart}
                    >
                      <IconMediaFastBackwardsFill18 />
                    </ViewerHud.Tool>
                    <ViewerHud.Tool
                      label="Set Loop End"
                      onClick={gif.setLoopEnd}
                    >
                      <IconMediaFastForwardFill18 />
                    </ViewerHud.Tool>
                    <ViewerHud.Tool
                      label="Reset Loop Range"
                      disabled={!gif.loop}
                      onClick={gif.resetLoop}
                    >
                      <IconRefreshFill18 />
                    </ViewerHud.Tool>
                  </ViewerHud.Pill>
                ) : null}
                <ViewerHud.Pill role="toolbar" aria-label="Annotate">
                  <ViewerHud.Tool
                    label="Crop"
                    onClick={() => toggleMode("crop")}
                  >
                    <IconCropFill18 />
                  </ViewerHud.Tool>
                  <ViewerHud.Tool
                    label="Comment"
                    shortcut={<ShortcutKeys id="viewer.comment" />}
                    pressed={mode === "comment"}
                    onClick={() => toggleMode("comment")}
                  >
                    <IconPencilFill18 />
                  </ViewerHud.Tool>
                </ViewerHud.Pill>
              </ViewerHud.Cluster>
              <ViewerHud.Cluster anchor="top-center">
                <ZoomPill actual={actual} onOut={zoomOut} onIn={zoomIn} />
              </ViewerHud.Cluster>
              <ViewerHud.Cluster anchor="bottom-right">
                <ViewerHud.Pill role="toolbar" aria-label="Size">
                  <ViewerHud.Tool
                    label="Actual Size"
                    shortcut={<ShortcutKeys id="viewer.actual-size" />}
                    onClick={actualSize}
                  >
                    <IconSizeLgOutline18 />
                  </ViewerHud.Tool>
                  <ViewerHud.Tool
                    label="Fit"
                    shortcut={<ShortcutKeys id="viewer.zoom-fit" />}
                    onClick={() => setPosition(() => FIT_POSE)}
                  >
                    <IconExpandFill18 />
                  </ViewerHud.Tool>
                </ViewerHud.Pill>
              </ViewerHud.Cluster>
              <ViewerHud.Cluster anchor="top-left">
                <ViewerHud.Pill role="toolbar" aria-label="Transform">
                  <ViewerHud.Tool
                    label="Rotate"
                    disabled={busy}
                    onClick={() =>
                      void run(() =>
                        applyInspect(
                          save.id,
                          rotatePatch(save, 90),
                          "inspect:rotate",
                        ),
                      )
                    }
                  >
                    <IconRotateImageClockwiseFill18 />
                  </ViewerHud.Tool>
                  <ViewerHud.Tool
                    label="Flip"
                    disabled={busy}
                    onClick={() =>
                      void run(() =>
                        applyInspect(
                          save.id,
                          flipPatch(save, "x"),
                          "inspect:flip",
                        ),
                      )
                    }
                  >
                    <IconFlipHorizontal2Fill18 />
                  </ViewerHud.Tool>
                  <ViewerHud.Tool
                    label="Grayscale"
                    pressed={grayscale}
                    onClick={() => inspect.toggleGrayscale()}
                  >
                    <IconContrastFill18 />
                  </ViewerHud.Tool>
                </ViewerHud.Pill>
              </ViewerHud.Cluster>
              <ViewerHud.Cluster anchor="top-right">
                <ViewerHud.Pill role="toolbar" aria-label="View">
                  <ViewerHud.Tool
                    label="Reset"
                    disabled={busy}
                    onClick={() =>
                      void run(() =>
                        applyInspect(
                          save.id,
                          resetTransformPatch(),
                          "inspect:reset",
                        ),
                      )
                    }
                  >
                    <IconRefreshFill18 />
                  </ViewerHud.Tool>
                </ViewerHud.Pill>
              </ViewerHud.Cluster>
            </>
          )}
        </ViewerHud.Root>
      ) : null}
    </div>
  );
}

const HANDLE_LABEL: Record<CropHandle, string> = {
  n: "Resize Top",
  s: "Resize Bottom",
  e: "Resize Right",
  w: "Resize Left",
  nw: "Resize Top Left",
  ne: "Resize Top Right",
  sw: "Resize Bottom Left",
  se: "Resize Bottom Right",
};

function ZoomPill({
  actual,
  onOut,
  onIn,
}: {
  actual: number;
  onOut: () => void;
  onIn: () => void;
}) {
  return (
    <ViewerHud.Pill role="toolbar" aria-label="Zoom">
      <ViewerHud.Tool label="Zoom Out" onClick={onOut}>
        <IconMinusFill18 />
      </ViewerHud.Tool>
      <ViewerHud.Scale>{Math.round(actual * 100)}%</ViewerHud.Scale>
      <ViewerHud.Tool label="Zoom In" onClick={onIn}>
        <IconPlusFill18 />
      </ViewerHud.Tool>
    </ViewerHud.Pill>
  );
}

function cropHandleFromTarget(target: EventTarget | null): CropHandle | null {
  if (!(target instanceof Element)) return null;
  const value = target.closest("[data-handle]")?.getAttribute("data-handle");
  return CROP_HANDLES.find((handle) => handle === value) ?? null;
}
