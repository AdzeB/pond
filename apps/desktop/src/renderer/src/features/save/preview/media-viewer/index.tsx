import {
  IconArrowLeftOutline18 as ArrowLeft,
  IconArrowRightOutline18 as ArrowRight,
} from "@pond/icons/outline/18";
import { Button, Tooltip } from "@pond/ui";
import useEmblaCarousel from "embla-carousel-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { buildMediaUnits } from "@/core/data/media";
import { useResolvedTheme } from "@/core/data/theme";
import type { Save } from "@/core/data/types";
import { VideoPlayer } from "@/features/media/video-player";
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
  const prevIndexRef = useRef(0);

  // Sync the thumb strip to the main carousel. Wrap-around (last <-> first)
  // jumps instantly so the strip doesn't smooth-scroll the entire length
  // backwards.
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

  // Keep `<VideoPlayer>` mounted while its slide is anywhere in the viewport,
  // not just when it's the selected snap. Otherwise the player unmounts the
  // moment Embla commits to the next snap mid-drag and the video flashes off
  // before the slide has finished sliding away.
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

  // Drive the thumb-strip edge fades from the actual scroll position so the
  // gradient only hints at content you can still scroll to.
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
    <div className={styles.carousel}>
      <div className={styles.stage}>
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
                        save={save}
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
                    <div className={styles["media-shell"]}>
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
                    </div>
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
    </div>
  );
}
