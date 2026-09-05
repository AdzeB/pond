import { type CSSProperties, useCallback, useState } from "react";
import {
  type NoteMarker,
  VideoPlayer,
} from "@/features/saves/components/video-player/video-player";
import type { ChapterCue } from "@/features/saves/lib/media/chapters-vtt";
import { startNativeDrag } from "@/features/saves/lib/start-drag";
import styles from "./slide.module.css";

export interface MediaSlide {
  src: string;
  fileIndex: number;
  isVideo: boolean;
  posterUrl?: string;
  width?: number;
  height?: number;
}

interface SlideProps {
  slide: MediaSlide;
  active: boolean;
  inView: boolean;
  saveId: string;
  title?: string | null;
  artist?: string | null;
  chapters?: ChapterCue[];
  noteMarkers?: readonly NoteMarker[];
  ratio?: number;
  onRatio?: (src: string, ratio: number) => void;
  onError: () => void;
}

/** Blossom's scroller has a zero-width content box, so a shrink-to-fit shell collapses invisibly; the shell must derive its width from an aspect-ratio.
 * @remarks 16/9 seeds the box until the media reports its natural size, so it is never zero and ends up pixel-accurate. */
const FALLBACK_RATIO = 16 / 9;

interface RatioStyle extends CSSProperties {
  "--ratio": string;
}

function ratioStyle(ratio: number): RatioStyle {
  return {
    aspectRatio: String(ratio),
    "--ratio": String(ratio),
  };
}

function knownRatio(slide: MediaSlide): number | null {
  return slide.width && slide.height ? slide.width / slide.height : null;
}

export function Slide({
  slide,
  active,
  inView,
  saveId,
  title,
  artist,
  chapters,
  noteMarkers,
  ratio,
  onRatio,
  onError,
}: SlideProps) {
  return (
    <div
      className={styles.slide}
      data-blossom-slide
      data-file-index={slide.fileIndex}
      data-active={active ? "true" : undefined}
    >
      {slide.isVideo ? (
        inView ? (
          <VideoSlide
            slide={slide}
            active={active}
            saveId={saveId}
            title={title}
            artist={artist}
            chapters={chapters}
            noteMarkers={noteMarkers}
            ratioOverride={ratio}
            onRatio={onRatio}
            onError={onError}
          />
        ) : (
          <PosterSlide slide={slide} saveId={saveId} ratioOverride={ratio} />
        )
      ) : (
        <ImageSlide
          slide={slide}
          title={title}
          active={active}
          saveId={saveId}
          ratioOverride={ratio}
          onRatio={onRatio}
          onError={onError}
        />
      )}
    </div>
  );
}

function useResolvedRatio(slide: MediaSlide, override?: number) {
  const [local, setLocal] = useState<number | null>(() => knownRatio(slide));
  const ratio = override ?? local ?? FALLBACK_RATIO;
  return { ratio, setLocal };
}

function VideoSlide({
  slide,
  active,
  title,
  artist,
  saveId,
  chapters,
  noteMarkers,
  ratioOverride,
  onRatio,
  onError,
}: {
  slide: MediaSlide;
  active: boolean;
  saveId: string;
  title?: string | null;
  artist?: string | null;
  chapters?: ChapterCue[];
  noteMarkers?: readonly NoteMarker[];
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
        title={title}
        artist={artist}
        saveId={saveId}
        active={active}
        width={slide.width}
        height={slide.height}
        chapters={chapters}
        noteMarkers={noteMarkers}
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
  saveId,
  ratioOverride,
}: {
  slide: MediaSlide;
  saveId: string;
  ratioOverride?: number;
}) {
  const { ratio } = useResolvedRatio(slide, ratioOverride);
  if (!slide.posterUrl)
    return <div className={styles["media-shell"]} style={ratioStyle(ratio)} />;
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: native drag from the poster
    <div
      className={styles["media-shell"]}
      style={ratioStyle(ratio)}
      draggable
      onDragStart={(event) => {
        event.preventDefault();
        startNativeDrag(saveId);
      }}
    >
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
  saveId,
  ratioOverride,
  onRatio,
  onError,
}: {
  slide: MediaSlide;
  title?: string | null;
  active: boolean;
  saveId: string;
  ratioOverride?: number;
  onRatio?: (src: string, ratio: number) => void;
  onError: () => void;
}) {
  const { ratio, setLocal } = useResolvedRatio(slide, ratioOverride);
  /** A cached image is already `complete` before onLoad can attach, so the ref reads the natural ratio directly. */
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
    // biome-ignore lint/a11y/noStaticElementInteractions: native drag from the image
    <div
      className={styles["media-shell"]}
      style={ratioStyle(ratio)}
      draggable
      onDragStart={(event) => {
        event.preventDefault();
        startNativeDrag(saveId);
      }}
    >
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
