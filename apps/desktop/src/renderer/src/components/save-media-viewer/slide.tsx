import { type CSSProperties, useCallback, useState } from "react";
import { VideoPlayer } from "@/components/video-player";
import type { ChapterCue } from "@/lib/chapters-vtt";
import styles from "./styles.module.css";

export interface MediaSlide {
  src: string;
  isVideo: boolean;
  posterUrl?: string;
  width?: number;
  height?: number;
}

interface SlideProps {
  slide: MediaSlide;
  active: boolean;
  inView: boolean;
  title?: string | null;
  chapters?: ChapterCue[];
  // Controlled aspect ratio from the carousel's cache (kept identical for the
  // player and its placeholder so toggling in-view never resizes the slide).
  // Omitted on the single-item path, where the leaf manages its own ratio.
  ratio?: number;
  onRatio?: (src: string, ratio: number) => void;
  onError: () => void;
}

// Blossom's scroller has a zero-width content box (padding-inline: 50% centres
// the active slide), so the inline space available to each slide is 0. A
// media-shell that sizes by shrink-to-fit therefore collapses to width 0 and the
// slide renders invisibly. The shell MUST derive its width from an aspect-ratio
// instead. We use the known intrinsic size when stored, otherwise a 16/9
// fallback that is refined to the real ratio once the media reports its natural
// size on load — so the box is never zero and ends up pixel-accurate.
const FALLBACK_RATIO = 16 / 9;

function ratioStyle(ratio: number): CSSProperties {
  return {
    aspectRatio: String(ratio),
    "--ratio": String(ratio),
  } as CSSProperties;
}

function knownRatio(slide: MediaSlide): number | null {
  return slide.width && slide.height ? slide.width / slide.height : null;
}

export function Slide({
  slide,
  active,
  inView,
  title,
  chapters,
  ratio,
  onRatio,
  onError,
}: SlideProps) {
  return (
    <div className={styles.slide} data-blossom-slide>
      {slide.isVideo ? (
        // Keep VideoPlayer mounted only near the centre; the poster placeholder
        // reserves the identical box so swapping the two never shifts layout.
        inView ? (
          <VideoSlide
            slide={slide}
            active={active}
            chapters={chapters}
            ratioOverride={ratio}
            onRatio={onRatio}
            onError={onError}
          />
        ) : (
          <PosterSlide slide={slide} ratioOverride={ratio} />
        )
      ) : (
        <ImageSlide
          slide={slide}
          title={title}
          active={active}
          ratioOverride={ratio}
          onRatio={onRatio}
          onError={onError}
        />
      )}
    </div>
  );
}

// Resolve the box ratio: the carousel's shared cache wins, else the value the
// media reports on load (seeded from the stored dims), else a fallback so the
// box is never zero. The loaded value overrides the stored dims, which can be
// stale or rotated and would otherwise letterbox the media inside the shell.
function useResolvedRatio(slide: MediaSlide, override?: number) {
  const [local, setLocal] = useState<number | null>(() => knownRatio(slide));
  const ratio = override ?? local ?? FALLBACK_RATIO;
  return { ratio, setLocal };
}

function VideoSlide({
  slide,
  active,
  chapters,
  ratioOverride,
  onRatio,
  onError,
}: {
  slide: MediaSlide;
  active: boolean;
  chapters?: ChapterCue[];
  ratioOverride?: number;
  onRatio?: (src: string, ratio: number) => void;
  onError: () => void;
}) {
  const { ratio, setLocal } = useResolvedRatio(slide, ratioOverride);
  return (
    <div className={styles["media-shell"]} style={ratioStyle(ratio)}>
      <VideoPlayer
        src={slide.src}
        poster={slide.posterUrl}
        active={active}
        width={slide.width}
        height={slide.height}
        chapters={chapters}
        onRatio={(r) => {
          setLocal(r);
          onRatio?.(slide.src, r);
        }}
        onError={onError}
      />
    </div>
  );
}

function PosterSlide({
  slide,
  ratioOverride,
}: {
  slide: MediaSlide;
  ratioOverride?: number;
}) {
  const { ratio } = useResolvedRatio(slide, ratioOverride);
  if (!slide.posterUrl)
    return <div className={styles["media-shell"]} style={ratioStyle(ratio)} />;
  return (
    <div className={styles["media-shell"]} style={ratioStyle(ratio)}>
      <img
        src={slide.posterUrl}
        alt=""
        className={styles.media}
        decoding="async"
        draggable={false}
        width={slide.width}
        height={slide.height}
      />
    </div>
  );
}

function ImageSlide({
  slide,
  title,
  active,
  ratioOverride,
  onRatio,
  onError,
}: {
  slide: MediaSlide;
  title?: string | null;
  active: boolean;
  ratioOverride?: number;
  onRatio?: (src: string, ratio: number) => void;
  onError: () => void;
}) {
  const { ratio, setLocal } = useResolvedRatio(slide, ratioOverride);
  // Capture the natural ratio both on load and on mount: a cached image is
  // already `complete` before onLoad can attach, so the ref reads it directly.
  const measure = useCallback(
    (img: HTMLImageElement | null) => {
      if (img?.complete && img.naturalWidth && img.naturalHeight) {
        const r = img.naturalWidth / img.naturalHeight;
        setLocal(r);
        onRatio?.(slide.src, r);
      }
    },
    [slide.src, onRatio, setLocal],
  );
  return (
    <div className={styles["media-shell"]} style={ratioStyle(ratio)}>
      <img
        ref={measure}
        src={slide.src}
        alt={title ?? ""}
        className={styles.media}
        decoding="async"
        draggable={false}
        fetchPriority={active ? "high" : "low"}
        width={slide.width}
        height={slide.height}
        onLoad={(event) => {
          const img = event.currentTarget;
          if (img.naturalWidth && img.naturalHeight) {
            const r = img.naturalWidth / img.naturalHeight;
            setLocal(r);
            onRatio?.(slide.src, r);
          }
        }}
        onError={onError}
      />
    </div>
  );
}
