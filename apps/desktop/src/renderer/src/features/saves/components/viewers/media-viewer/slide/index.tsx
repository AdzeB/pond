import { useState } from "react";
import {
  type NoteMarker,
  VideoPlayer,
} from "@/features/saves/components/video-player";
import { ImageInspector } from "@/features/saves/components/viewers/image-inspector";
import type { ChapterCue } from "@/features/saves/lib/media/chapters-vtt";
import { beginSaveDrag } from "@/features/saves/lib/start-drag";
import type { Save } from "@/features/saves/types";
import styles from "./styles.module.css";

export interface MediaSlide {
  src: string;
  fileIndex: number;
  isVideo: boolean;
  isAnimation?: boolean;
  posterUrl?: string;
  width?: number;
  height?: number;
}

interface SlideProps {
  slide: MediaSlide;
  active: boolean;
  inView: boolean;
  save: Save;
  onNavigate?: (id: string) => void;
  title?: string | null;
  artist?: string | null;
  chapters?: ChapterCue[];
  noteMarkers?: readonly NoteMarker[];
  ratio?: number;
  onRatio?: (src: string, ratio: number) => void;
  onError: () => void;
}

function knownRatio(slide: MediaSlide): number | null {
  return slide.width && slide.height ? slide.width / slide.height : null;
}

export function Slide({
  slide,
  active,
  inView,
  save,
  onNavigate,
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
            saveId={save.id}
            active={active}
            title={title}
            artist={artist}
            chapters={chapters}
            noteMarkers={noteMarkers}
            ratioOverride={ratio}
            onRatio={onRatio}
            onError={onError}
          />
        ) : (
          <PosterSlide slide={slide} saveId={save.id} />
        )
      ) : (
        <ImageSlide
          slide={slide}
          active={active}
          save={save}
          onNavigate={onNavigate}
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
  return { ratio: override ?? local, setLocal };
}

function VideoSlide({
  slide,
  saveId,
  active,
  title,
  artist,
  chapters,
  noteMarkers,
  ratioOverride,
  onRatio,
  onError,
}: {
  slide: MediaSlide;
  saveId: string;
  active: boolean;
  title?: string | null;
  artist?: string | null;
  chapters?: ChapterCue[];
  noteMarkers?: readonly NoteMarker[];
  ratioOverride?: number;
  onRatio?: (src: string, ratio: number) => void;
  onError: () => void;
}) {
  const { setLocal } = useResolvedRatio(slide, ratioOverride);
  return (
    <div className={styles["media-shell"]}>
      <VideoPlayer
        src={slide.src}
        saveId={saveId}
        fileIndex={slide.fileIndex}
        poster={slide.posterUrl}
        title={title}
        artist={artist}
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

function PosterSlide({ slide, saveId }: { slide: MediaSlide; saveId: string }) {
  if (!slide.posterUrl) return <div className={styles["media-shell"]} />;
  return (
    <button
      type="button"
      className={styles["media-shell"]}
      aria-label="Drag save"
      draggable
      onDragStart={(event) => {
        beginSaveDrag(saveId, event.dataTransfer);
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
    </button>
  );
}

function ImageSlide({
  slide,
  active,
  save,
  onNavigate,
  ratioOverride,
  onRatio,
  onError,
}: {
  slide: MediaSlide;
  active: boolean;
  save: Save;
  onNavigate?: (id: string) => void;
  ratioOverride?: number;
  onRatio?: (src: string, ratio: number) => void;
  onError: () => void;
}) {
  const { setLocal } = useResolvedRatio(slide, ratioOverride);
  return (
    <div className={styles["media-shell"]}>
      <ImageInspector
        key={slide.src}
        save={save}
        fileIndex={slide.fileIndex}
        src={slide.src}
        active={active}
        onNavigate={onNavigate}
        onRatio={(r) => {
          setLocal(r);
          onRatio?.(slide.src, r);
        }}
        onError={onError}
      />
    </div>
  );
}
