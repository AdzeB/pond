import {
  IconArrowLeftOutline18 as ArrowLeft,
  IconArrowRightOutline18 as ArrowRight,
  IconEyeOutline18 as Eye,
  IconXmarkOutline18 as X,
} from "@pond/icons/outline/18";
import { Button, Dialog, Tooltip } from "@pond/ui";
import useEmblaCarousel from "embla-carousel-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { VideoPlayer } from "@/components/video-player";
import { useResolvedTheme } from "@/hooks/use-resolved-theme";
import { type ChapterCue, chaptersForSave } from "@/lib/chapters-vtt";
import { buildMediaUnits } from "@/lib/media";
import { useSensitiveMedia } from "@/lib/nsfw";
import type { Save } from "@/lib/types";
import styles from "./styles.module.css";

interface MediaSlide {
  src: string;
  isVideo: boolean;
  posterUrl?: string;
  width?: number;
  height?: number;
}

export function MediaViewer({ save }: { save: Save }) {
  const theme = useResolvedTheme();
  const { blurred, reveal } = useSensitiveMedia(save);
  const chapters = useMemo<ChapterCue[]>(() => chaptersForSave(save), [save]);
  const singleVideo = useMemo(
    () =>
      buildMediaUnits(save, { theme }).filter((u) => u.isVideo).length === 1,
    [save, theme],
  );
  const allSlides = useMemo<MediaSlide[]>(
    () =>
      buildMediaUnits(save, { theme }).map((u) => {
        const file = save.files.find((f) => f.path === u.key);
        return {
          src: u.url,
          isVideo: u.isVideo,
          posterUrl: u.posterUrl,
          width: file?.width ?? save.width ?? undefined,
          height: file?.height ?? save.height ?? undefined,
        };
      }),
    [save, theme],
  );

  const [broken, setBroken] = useState<ReadonlySet<string>>(
    () => new Set<string>(),
  );
  const markBroken = useCallback((src: string) => {
    setBroken((prev) => {
      if (prev.has(src)) return prev;
      const next = new Set(prev);
      next.add(src);
      return next;
    });
  }, []);

  const slides = useMemo(
    () => allSlides.filter((s) => !broken.has(s.src)),
    [allSlides, broken],
  );

  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    align: "center",
    duration: 28,
    draggable: true,
  });

  const [thumbsRef, thumbsApi] = useEmblaCarousel({
    containScroll: "keepSnaps",
    dragFree: true,
    align: "center",
  });

  const [index, setIndex] = useState(0);
  const [thumbAtStart, setThumbAtStart] = useState(true);
  const [thumbAtEnd, setThumbAtEnd] = useState(true);
  const [inViewSnaps, setInViewSnaps] = useState<readonly number[]>([0]);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const prevIndexRef = useRef(0);
  // Distinguish a tap from a carousel drag so panning the strip doesn't pop the
  // lightbox open: remember the press origin and bail if the pointer travelled.
  const pressRef = useRef<{ x: number; y: number } | null>(null);

  const onZoomPointerDown = useCallback((e: React.PointerEvent) => {
    pressRef.current = { x: e.clientX, y: e.clientY };
  }, []);

  const openLightbox = useCallback((src: string, e: React.MouseEvent) => {
    const origin = pressRef.current;
    pressRef.current = null;
    if (origin) {
      const moved = Math.hypot(e.clientX - origin.x, e.clientY - origin.y);
      if (moved > 6) return;
    }
    setLightboxSrc(src);
  }, []);

  // Sync the thumb strip to the carousel; wrap-around jumps instantly to avoid scrolling the whole length.
  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => {
      const i = emblaApi.selectedSnap();
      const prev = prevIndexRef.current;
      prevIndexRef.current = i;
      setIndex(i);
      if (!thumbsApi) return;
      const total = emblaApi.snapList().length;
      const wrapped = total > 2 && Math.abs(i - prev) === total - 1;
      thumbsApi.goTo(i, wrapped);
    };
    emblaApi.on("select", onSelect);
    onSelect();
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi, thumbsApi]);

  // Keep VideoPlayer mounted while its slide is anywhere in view, else it flashes off mid-drag.
  useEffect(() => {
    if (!emblaApi) return;
    const update = () => setInViewSnaps(emblaApi.slidesInView());
    update();
    emblaApi.on("slidesinview", update);
    emblaApi.on("reinit", update);
    return () => {
      emblaApi.off("slidesinview", update);
      emblaApi.off("reinit", update);
    };
  }, [emblaApi]);

  // Drive thumb-strip edge fades from scroll position so the gradient only hints at scrollable content.
  useEffect(() => {
    if (!thumbsApi) return;
    const update = () => {
      const canPrev = thumbsApi.canGoToPrev();
      const canNext = thumbsApi.canGoToNext();
      if (!canPrev && !canNext) {
        setThumbAtStart(true);
        setThumbAtEnd(true);
        return;
      }
      const progress = thumbsApi.scrollProgress();
      setThumbAtStart(progress <= 0.001);
      setThumbAtEnd(progress >= 0.999);
    };
    update();
    thumbsApi.on("scroll", update);
    thumbsApi.on("select", update);
    thumbsApi.on("reinit", update);
    return () => {
      thumbsApi.off("scroll", update);
      thumbsApi.off("select", update);
      thumbsApi.off("reinit", update);
    };
  }, [thumbsApi]);

  const goPrev = useCallback(() => emblaApi?.goToPrev(), [emblaApi]);
  const goNext = useCallback(() => emblaApi?.goToNext(), [emblaApi]);
  const goTo = useCallback((i: number) => emblaApi?.goTo(i), [emblaApi]);

  if (slides.length === 0) return null;
  const activeIndex = Math.min(index, slides.length - 1);
  const hasMany = slides.length > 1;

  return (
    <div
      className={styles.carousel}
      data-blurred={blurred ? "true" : undefined}
    >
      <div className={styles.stage}>
        {blurred ? (
          <button
            type="button"
            className={styles.sensitive}
            aria-label="Reveal sensitive media"
            title="Sensitive media — click to reveal"
            onClick={reveal}
          >
            <span className={styles["sensitive-badge"]}>
              <Eye width={18} height={18} aria-hidden />
              Reveal sensitive media
            </span>
          </button>
        ) : null}
        <div className={styles.viewport} ref={emblaRef}>
          <div className={styles.container}>
            {slides.map((s, i) => {
              const isActive = i === activeIndex;
              const inView = inViewSnaps.includes(i);
              return (
                <div key={s.src} className={styles.slide}>
                  {s.isVideo ? (
                    inView ? (
                      <VideoPlayer
                        src={s.src}
                        poster={s.posterUrl}
                        active={isActive}
                        width={s.width}
                        height={s.height}
                        chapters={singleVideo ? chapters : undefined}
                        onError={() => markBroken(s.src)}
                      />
                    ) : (
                      <div className={styles["media-shell"]}>
                        {s.posterUrl ? (
                          <img
                            src={s.posterUrl}
                            alt=""
                            className={styles.media}
                            decoding="async"
                            draggable={false}
                            width={s.width}
                            height={s.height}
                          />
                        ) : null}
                      </div>
                    )
                  ) : (
                    <button
                      type="button"
                      className={styles["media-shell"]}
                      data-zoom-trigger="true"
                      aria-label="View full size"
                      onPointerDown={onZoomPointerDown}
                      onClick={(e) => openLightbox(s.src, e)}
                    >
                      <img
                        src={s.src}
                        alt={save.title ?? ""}
                        className={styles.media}
                        decoding="async"
                        draggable={false}
                        fetchPriority={isActive ? "high" : "low"}
                        width={s.width}
                        height={s.height}
                        onError={() => markBroken(s.src)}
                      />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        {hasMany ? (
          <>
            <Tooltip label="Previous" side="right">
              <Button
                size="sm"
                icon
                onClick={goPrev}
                aria-label="Previous"
                className={styles.nav}
                data-side="prev"
              >
                <ArrowLeft width={14} height={14} />
              </Button>
            </Tooltip>
            <Tooltip label="Next" side="left">
              <Button
                size="sm"
                icon
                onClick={goNext}
                aria-label="Next"
                className={styles.nav}
                data-side="next"
              >
                <ArrowRight width={14} height={14} />
              </Button>
            </Tooltip>
          </>
        ) : null}
      </div>
      {hasMany ? (
        <div
          className={styles.slides}
          ref={thumbsRef}
          data-at-start={thumbAtStart ? "true" : undefined}
          data-at-end={thumbAtEnd ? "true" : undefined}
        >
          <div className={styles["slides-container"]}>
            {slides.map((s, i) => {
              const active = i === activeIndex;
              const thumbSrc = s.isVideo ? s.posterUrl : s.src;
              const ratio =
                s.width && s.height ? `${s.width} / ${s.height}` : undefined;

              return (
                <button
                  key={s.src}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  aria-label={`Slide ${i + 1}`}
                  className={styles.thumbnail}
                  data-active={active ? "true" : undefined}
                  data-video={s.isVideo ? "true" : undefined}
                  style={ratio ? { aspectRatio: ratio } : undefined}
                  onClick={() => goTo(i)}
                >
                  {thumbSrc ? (
                    <img
                      alt=""
                      src={thumbSrc}
                      loading="lazy"
                      decoding="async"
                      draggable={false}
                      className={styles.image}
                      onError={() => markBroken(s.src)}
                    />
                  ) : (
                    <span className={styles.fallback} aria-hidden="true" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
      {lightboxSrc ? (
        <Lightbox
          src={lightboxSrc}
          alt={save.title ?? ""}
          onClose={() => setLightboxSrc(null)}
        />
      ) : null}
    </div>
  );
}

const MAX_ZOOM = 6;
const MIN_ZOOM = 1;
const DOUBLE_CLICK_ZOOM = 2.5;

// Fullscreen zoom/pan viewer for a single image. A nested Base UI dialog so
// it layers above the detail modal with correct focus/Escape handling. Wheel
// (or trackpad pinch) zooms; drag pans when zoomed; double-click toggles.
function Lightbox({
  src,
  alt,
  onClose,
}: {
  src: string;
  alt: string;
  onClose: () => void;
}) {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{
    x: number;
    y: number;
    ox: number;
    oy: number;
  } | null>(null);

  const reset = useCallback(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setScale((prev) => {
      const next = Math.min(
        MAX_ZOOM,
        Math.max(MIN_ZOOM, prev * (e.deltaY < 0 ? 1.15 : 1 / 1.15)),
      );
      if (next === MIN_ZOOM) setOffset({ x: 0, y: 0 });
      return next;
    });
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (scale <= 1) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      dragRef.current = {
        x: e.clientX,
        y: e.clientY,
        ox: offset.x,
        oy: offset.y,
      };
    },
    [scale, offset],
  );

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    setOffset({
      x: drag.ox + (e.clientX - drag.x),
      y: drag.oy + (e.clientY - drag.y),
    });
  }, []);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    dragRef.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  }, []);

  const toggleZoom = useCallback(() => {
    setScale((prev) => {
      if (prev > 1) {
        setOffset({ x: 0, y: 0 });
        return 1;
      }
      return DOUBLE_CLICK_ZOOM;
    });
  }, []);

  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className={styles["lightbox-backdrop"]} />
        <Dialog.Popup
          className={styles.lightbox}
          aria-label="Image viewer"
          onWheel={onWheel}
          onPointerDown={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <Tooltip label="Close (Esc)" side="left">
            <Button
              icon
              size="sm"
              variant="secondary"
              aria-label="Close"
              className={styles["lightbox-close"]}
              onClick={onClose}
            >
              <X />
            </Button>
          </Tooltip>
          <img
            src={src}
            alt={alt}
            className={styles["lightbox-image"]}
            draggable={false}
            data-zoomed={scale > 1 ? "true" : undefined}
            style={{
              transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            }}
            onDoubleClick={toggleZoom}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          />
          {scale > 1 ? (
            <button
              type="button"
              className={styles["lightbox-reset"]}
              onClick={reset}
            >
              Reset zoom
            </button>
          ) : null}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
