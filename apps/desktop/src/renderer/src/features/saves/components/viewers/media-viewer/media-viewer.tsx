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
import { NavButtons } from "@/features/saves/components/viewers/media-viewer/controls/controls";
import {
  type MediaSlide,
  Slide,
} from "@/features/saves/components/viewers/media-viewer/slide/slide";
import {
  copyVideoFrame,
  saveVideoFrame,
} from "@/features/saves/lib/media/capture-frame";
import {
  type ChapterCue,
  chaptersForSave,
} from "@/features/saves/lib/media/chapters-vtt";
import { buildMediaUnits } from "@/features/saves/lib/media/units";
import { previewUrlFor } from "@/features/saves/lib/media/url";
import type { Save } from "@/features/saves/types";
import { useResolvedTheme } from "@/features/settings/hooks/use-resolved-theme";
import { SHORTCUTS } from "@/shared/lib/shortcuts";
import {
  useActiveSlide,
  useCarouselNavigation,
  useRatioCache,
} from "./lib/use-carousel";
import styles from "./media-viewer.module.css";

export interface ViewerNav {
  step: (delta: number) => boolean;
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
            src: u.requiresGeneratedPreview ? previewUrlFor(u.url) : u.url,
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
          saveId={save.id}
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
      key={save.id}
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
  slideNav = false,
  children,
}: {
  activeIndex?: number;
  slideNav?: boolean;
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
    <div
      ref={ref}
      className={styles.carousel}
      data-slide-nav={slideNav || undefined}
    >
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
  const { goPrev, goNext, step } = useCarouselNavigation(scroller, ratios);

  useHotkey(
    SHORTCUTS["viewer.prev-slide"].keys!,
    (event) => {
      event.preventDefault();
      goPrev();
    },
    { preventDefault: false, ignoreInputs: true, conflictBehavior: "allow" },
  );
  useHotkey(
    SHORTCUTS["viewer.next-slide"].keys!,
    (event) => {
      event.preventDefault();
      goNext();
    },
    { preventDefault: false, ignoreInputs: true, conflictBehavior: "allow" },
  );

  useEffect(() => {
    setScroller(handleRef.current?.element ?? null);
  }, []);

  useEffect(() => {
    onActiveFileIndexChange?.(slides[active]?.fileIndex ?? null);
  }, [active, slides, onActiveFileIndexChange]);

  useEffect(() => {
    if (!navRef) return;
    navRef.current = { step };
    return () => {
      navRef.current = null;
    };
  }, [navRef, step]);

  return (
    <Frame activeIndex={active} slideNav>
      <BlossomCarousel
        ref={handleRef}
        className={styles.scroller}
        load="always"
      >
        {slides.map((s, i) => (
          <Slide
            key={s.src}
            slide={s}
            saveId={save.id}
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
