import {
  BlossomCarousel,
  type BlossomCarouselHandle,
} from "@blossom-carousel/react";
import "@blossom-carousel/react/style.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { NavButtons } from "@/components/save-media-viewer-controls";
import { type MediaSlide, Slide } from "@/components/save-media-viewer-slide";
import { useResolvedTheme } from "@/hooks/use-resolved-theme";
import { type ChapterCue, chaptersForSave } from "@/lib/media/chapters-vtt";
import { buildMediaUnits } from "@/lib/media/units";
import type { Save } from "@/lib/types";
import { showContextMenu } from "@/lib/ui/native-menu";
import { tagClipboard } from "@/stores/tag-clipboard";
import { buildViewerMenu } from "./lib/menu";
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
      <Frame save={save}>
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

function Frame({ save, children }: { save: Save; children: React.ReactNode }) {
  /** Built lazily on open so the live <video> under the cursor and the tag clipboard are read without subscribing to either. */
  const onContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    const slide = (e.target as HTMLElement).closest("[data-blossom-slide]");
    const video = slide?.querySelector<HTMLVideoElement>("video") ?? null;
    void showContextMenu(
      buildViewerMenu(save, {
        clipboardEmpty: tagClipboard.get().length === 0,
        video,
      }),
    );
  };

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: context menu container, not a control
    <div className={styles.carousel} onContextMenu={onContextMenu}>
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
    <Frame save={save}>
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
