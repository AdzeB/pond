import {
  BlossomCarousel,
  type BlossomCarouselHandle,
} from "@blossom-carousel/react";
import "@blossom-carousel/react/style.css";
import { useHotkey } from "@tanstack/react-hotkeys";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { NavButtons } from "@/components/save-media-viewer-controls";
import { type MediaSlide, Slide } from "@/components/save-media-viewer-slide";
import { useResolvedTheme } from "@/hooks/use-resolved-theme";
import { copyVideoFrame, saveVideoFrame } from "@/lib/media/capture-frame";
import { type ChapterCue, chaptersForSave } from "@/lib/media/chapters-vtt";
import { buildMediaUnits } from "@/lib/media/units";
import { SHORTCUTS } from "@/lib/save/shortcuts";
import type { Save } from "@/lib/types";
import {
  useActiveSlide,
  useCarouselNavigation,
  useRatioCache,
} from "./lib/use-carousel";
import styles from "./styles.module.css";

export function MediaViewer({ save }: { save: Save }) {
  const theme = useResolvedTheme();
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
  const slideChapters = singleVideo ? chapters : undefined;

  if (slides.length === 0) return null;

  /** A single media item renders directly so there is no scroller, snapping, or coverflow scaling to settle. */
  if (slides.length === 1) {
    const only = slides[0];
    if (!only) return null;
    return (
      <Frame>
        <Slide
          slide={only}
          active
          inView
          title={save.title}
          chapters={slideChapters}
          onError={() => markBroken(only.src)}
        />
      </Frame>
    );
  }

  return (
    <Carousel
      save={save}
      slides={slides}
      chapters={slideChapters}
      onError={markBroken}
    />
  );
}

/** The right-click menu lives one level up on the detail modal, covering media and chrome alike. */
function Frame({
  activeIndex = 0,
  children,
}: {
  /** Index of the slide the frame shortcuts act on. */
  activeIndex?: number;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const activeVideo = () => {
    const slides = ref.current?.querySelectorAll("[data-blossom-slide]");
    const video = slides?.[activeIndex]?.querySelector("video") ?? null;
    return video?.videoWidth ? video : null;
  };

  /** preventDefault only when a live video is under the keys, so Shift+C/S stay inert on image slides. */
  useHotkey(
    SHORTCUTS["viewer.copy-frame"].keys,
    (event) => {
      const video = activeVideo();
      if (!video) return;
      event.preventDefault();
      void copyVideoFrame(video);
    },
    { preventDefault: false },
  );
  useHotkey(
    SHORTCUTS["viewer.save-frame"].keys,
    (event) => {
      const video = activeVideo();
      if (!video) return;
      event.preventDefault();
      void saveVideoFrame(video);
    },
    { preventDefault: false },
  );

  return (
    <div ref={ref} className={styles.carousel}>
      {children}
    </div>
  );
}

function Carousel({
  save,
  slides,
  chapters,
  onError,
}: {
  save: Save;
  slides: MediaSlide[];
  chapters?: ChapterCue[];
  onError: (src: string) => void;
}) {
  const handleRef = useRef<BlossomCarouselHandle>(null);
  const [scroller, setScroller] = useState<HTMLElement | null>(null);
  const active = useActiveSlide(scroller, slides.length);
  const { ratios, reportRatio } = useRatioCache();
  const { goPrev, goNext } = useCarouselNavigation(scroller, ratios);

  useEffect(() => {
    setScroller(handleRef.current?.element ?? null);
  }, []);

  return (
    <Frame activeIndex={active}>
      <BlossomCarousel
        ref={handleRef}
        className={styles.scroller}
        load="always"
      >
        {slides.map((s, i) => (
          <Slide
            key={s.src}
            slide={s}
            active={i === active}
            /** The live player mounts only near the centre; neighbours stay posters. */
            inView={Math.abs(i - active) <= 1}
            title={save.title}
            chapters={chapters}
            ratio={ratios.get(s.src)}
            onRatio={reportRatio}
            onError={() => onError(s.src)}
          />
        ))}
      </BlossomCarousel>
      <NavButtons onPrev={goPrev} onNext={goNext} />
    </Frame>
  );
}
