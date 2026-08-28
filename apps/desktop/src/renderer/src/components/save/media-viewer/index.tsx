import {
  BlossomCarousel,
  type BlossomCarouselHandle,
} from "@blossom-carousel/react";
import "@blossom-carousel/react/style.css";
import { useHotkey } from "@tanstack/react-hotkeys";
import {
  type RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { NavButtons } from "@/components/save/media-viewer/controls";
import { type MediaSlide, Slide } from "@/components/save/media-viewer/slide";
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

/** Lets the page walk this save's slides before it moves to the next save. */
export interface ViewerNav {
  index: number;
  count: number;
  go: (delta: number) => void;
}

interface MediaViewerProps {
  save: Save;
  onActiveFileIndexChange?: (fileIndex: number | null) => void;
  navRef?: RefObject<ViewerNav | null>;
}

export function MediaViewer({
  save,
  onActiveFileIndexChange,
  navRef,
}: MediaViewerProps) {
  const theme = useResolvedTheme();
  const chapters = useMemo<ChapterCue[]>(() => chaptersForSave(save), [save]);
  const singleVideo = useMemo(
    () =>
      buildMediaUnits(save, { theme }).filter((u) => u.isVideo).length === 1,
    [save, theme],
  );
  const allSlides = useMemo<MediaSlide[]>(
    () =>
      buildMediaUnits(save, { theme }).flatMap((u) => {
        const fileIndex = save.files.findIndex((f) => f.path === u.key);
        if (fileIndex < 0) return [];
        const file = save.files[fileIndex];
        return [
          {
            src: u.url,
            fileIndex,
            isVideo: u.isVideo,
            posterUrl: u.posterUrl,
            width: file?.width ?? save.width ?? undefined,
            height: file?.height ?? save.height ?? undefined,
          },
        ];
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
  const noteMarkers = useMemo(
    () =>
      (save.videoNotes ?? []).map((n) => ({
        id: n.id,
        timeSec: n.timeSec,
      })),
    [save.videoNotes],
  );

  const firstFileIndex = slides[0]?.fileIndex ?? null;

  useEffect(() => {
    if (slides.length === 0) {
      onActiveFileIndexChange?.(null);
      return;
    }
    if (slides.length !== 1) return;
    onActiveFileIndexChange?.(firstFileIndex);
  }, [slides.length, firstFileIndex, onActiveFileIndexChange]);

  if (slides.length === 0) {
    return null;
  }

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
          artist={save.author}
          chapters={slideChapters}
          noteMarkers={noteMarkers}
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
      noteMarkers={noteMarkers}
      onError={markBroken}
      onActiveFileIndexChange={onActiveFileIndexChange}
      navRef={navRef}
    />
  );
}

function Frame({
  activeIndex = 0,
  children,
}: {
  activeIndex?: number;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const activeVideo = () => {
    const slides = ref.current?.querySelectorAll("[data-blossom-slide]");
    const video = slides?.[activeIndex]?.querySelector("video") ?? null;
    return video?.videoWidth ? video : null;
  };

  useHotkey(
    SHORTCUTS["viewer.copy-frame"].keys!,
    (event) => {
      const video = activeVideo();
      if (!video) return;
      event.preventDefault();
      void copyVideoFrame(video);
    },
    { preventDefault: false },
  );
  useHotkey(
    SHORTCUTS["viewer.save-frame"].keys!,
    (event) => {
      const video = activeVideo();
      if (!video) return;
      event.preventDefault();
      void saveVideoFrame(video);
    },
    { preventDefault: false },
  );
  useHotkey(
    SHORTCUTS["viewer.mute"].keys!,
    (event) => {
      const video = activeVideo();
      if (!video) return;
      event.preventDefault();
      video.muted = !video.muted;
    },
    { preventDefault: false, ignoreInputs: true },
  );
  useHotkey(
    SHORTCUTS["viewer.fullscreen"].keys!,
    (event) => {
      const video = activeVideo();
      const root = ref.current;
      if (!video || !root) return;
      event.preventDefault();
      if (document.fullscreenElement === root) {
        void document.exitFullscreen();
      } else {
        void root.requestFullscreen();
      }
    },
    { preventDefault: false, ignoreInputs: true },
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
  noteMarkers,
  onError,
  onActiveFileIndexChange,
  navRef,
}: {
  save: Save;
  slides: MediaSlide[];
  chapters?: ChapterCue[];
  noteMarkers?: readonly { id: string; timeSec: number }[];
  onError: (src: string) => void;
  onActiveFileIndexChange?: (fileIndex: number | null) => void;
  navRef?: RefObject<ViewerNav | null>;
}) {
  const handleRef = useRef<BlossomCarouselHandle>(null);
  const [scroller, setScroller] = useState<HTMLElement | null>(null);
  const active = useActiveSlide(scroller, slides.length);
  const { ratios, reportRatio } = useRatioCache();
  const { goPrev, goNext } = useCarouselNavigation(scroller, ratios);

  useHotkey(
    SHORTCUTS["viewer.prev-slide"].keys!,
    (event) => {
      event.preventDefault();
      goPrev();
    },
    { preventDefault: false, ignoreInputs: true },
  );
  useHotkey(
    SHORTCUTS["viewer.next-slide"].keys!,
    (event) => {
      event.preventDefault();
      goNext();
    },
    { preventDefault: false, ignoreInputs: true },
  );

  useEffect(() => {
    setScroller(handleRef.current?.element ?? null);
  }, []);

  useEffect(() => {
    onActiveFileIndexChange?.(slides[active]?.fileIndex ?? null);
  }, [active, slides, onActiveFileIndexChange]);

  useEffect(() => {
    if (!navRef) return;
    navRef.current = {
      index: active,
      count: slides.length,
      go: (delta) => (delta < 0 ? goPrev() : goNext()),
    };
    return () => {
      navRef.current = null;
    };
  }, [navRef, active, slides.length, goPrev, goNext]);

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
            inView={Math.abs(i - active) <= 1}
            title={save.title}
            artist={save.author}
            chapters={chapters}
            noteMarkers={noteMarkers}
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
