import { useHotkey } from "@tanstack/react-hotkeys";
import {
  type RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ViewerHud } from "@/features/saves/components/viewers/hud";
import {
  ChromePortal,
  ViewerChrome,
} from "@/features/saves/components/viewers/media-viewer/chrome/chrome";
import {
  type MediaSlide,
  Slide,
} from "@/features/saves/components/viewers/media-viewer/slide";
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
import { openSave } from "@/features/saves/lib/save-nav";
import type { Save } from "@/features/saves/types";
import { useResolvedTheme } from "@/features/settings/hooks/use-resolved-theme";
import { bindingKeys, useShortcutBindings } from "@/shared/lib/shortcuts";
import {
  useActiveSlide,
  useCarouselNavigation,
  useLockedSlideRatio,
} from "./lib/use-carousel";
import styles from "./styles.module.css";

export interface ViewerNav {
  step: (delta: number) => boolean;
}

interface MediaViewerProps {
  save: Save;
  onNavigate?: (id: string) => void;
  onActiveFileIndexChange?: (fileIndex: number | null) => void;
  navRef?: RefObject<ViewerNav | null>;
  showControls?: boolean;
}

export function MediaViewer({
  save,
  onNavigate = openSave,
  onActiveFileIndexChange,
  navRef,
  showControls = true,
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
            isAnimation:
              file?.mimeType === "image/gif" ||
              /\.gif$/i.test(file?.path ?? ""),
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
        fileIndex: n.fileIndex,
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
      <Frame showControls={showControls}>
        <Slide
          slide={only}
          save={save}
          onNavigate={onNavigate}
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
      onNavigate={onNavigate}
      slides={slides}
      chapters={slideChapters}
      noteMarkers={noteMarkers}
      onError={markBroken}
      onActiveFileIndexChange={onActiveFileIndexChange}
      navRef={navRef}
      showControls={showControls}
    />
  );
}

function Frame({
  activeIndex = 0,
  children,
  showControls,
}: {
  activeIndex?: number;
  children: React.ReactNode;
  showControls: boolean;
}) {
  const shortcuts = useShortcutBindings();
  const ref = useRef<HTMLDivElement>(null);

  const activeVideo = () => {
    const slides = ref.current?.querySelectorAll("[data-blossom-slide]");
    const video = slides?.length
      ? slides[activeIndex]?.querySelector("video")
      : ref.current?.querySelector("video");
    return video?.videoWidth ? video : null;
  };

  useHotkey(
    bindingKeys(shortcuts, "viewer.copy-frame"),
    (event) => {
      const video = activeVideo();
      if (!video) return;
      event.preventDefault();
      void copyVideoFrame(video);
    },
    { preventDefault: false, ignoreInputs: true },
  );
  useHotkey(
    bindingKeys(shortcuts, "viewer.save-frame"),
    (event) => {
      const video = activeVideo();
      if (!video) return;
      event.preventDefault();
      void saveVideoFrame(video);
    },
    { preventDefault: false, ignoreInputs: true },
  );
  useHotkey(
    bindingKeys(shortcuts, "viewer.mute"),
    (event) => {
      const video = activeVideo();
      if (!video) return;
      event.preventDefault();
      video.muted = !video.muted;
    },
    { preventDefault: false, ignoreInputs: true },
  );

  return (
    <div ref={ref} className={styles.carousel}>
      <ViewerChrome enabled={showControls}>{children}</ViewerChrome>
    </div>
  );
}

function Carousel({
  save,
  onNavigate,
  slides,
  chapters,
  noteMarkers,
  onError,
  onActiveFileIndexChange,
  navRef,
  showControls,
}: {
  save: Save;
  onNavigate: (id: string) => void;
  slides: MediaSlide[];
  chapters?: ChapterCue[];
  noteMarkers?: readonly { id: string; timeSec: number }[];
  onError: (src: string) => void;
  onActiveFileIndexChange?: (fileIndex: number | null) => void;
  navRef?: RefObject<ViewerNav | null>;
  showControls: boolean;
}) {
  const shortcuts = useShortcutBindings();
  const [scroller, setScroller] = useState<HTMLDivElement | null>(null);
  const active = useActiveSlide(scroller, slides.length);
  const { ratios, reportRatio } = useLockedSlideRatio();
  const { goPrev, goNext, step } = useCarouselNavigation(scroller, ratios);

  useHotkey(
    bindingKeys(shortcuts, "viewer.prev-slide"),
    (event) => {
      event.preventDefault();
      goPrev();
    },
    {
      preventDefault: false,
      ignoreInputs: true,
      conflictBehavior: "allow",
      enabled: !(slides[active]?.isVideo || slides[active]?.isAnimation),
    },
  );
  useHotkey(
    bindingKeys(shortcuts, "viewer.next-slide"),
    (event) => {
      event.preventDefault();
      goNext();
    },
    {
      preventDefault: false,
      ignoreInputs: true,
      conflictBehavior: "allow",
      enabled: !(slides[active]?.isVideo || slides[active]?.isAnimation),
    },
  );

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

  const pager = {
    index: active,
    count: slides.length,
    onPrev: goPrev,
    onNext: goNext,
  };

  return (
    <Frame activeIndex={active} showControls={showControls}>
      <div ref={setScroller} className={styles.scroller}>
        {slides.map((s, i) => (
          <Slide
            key={s.src}
            slide={s}
            save={save}
            onNavigate={onNavigate}
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
      </div>
      <ChromePortal slot="top">
        <ViewerHud.Pager {...pager} />
      </ChromePortal>
    </Frame>
  );
}
