import { useVideo, Video } from "@pond/ui";
import {
  type ReactEventHandler,
  useCallback,
  useEffect,
  useState,
} from "react";
import { useMediaSession } from "@/features/saves/hooks/use-media-session";
import {
  type ChapterCue,
  chaptersToVttUrl,
} from "@/features/saves/lib/media/chapters-vtt";
import {
  clearActiveMediaSeek,
  setActiveMediaSeek,
  setActiveMediaTime,
} from "@/features/saves/state/active-media";
import styles from "./video-player.module.css";

export interface NoteMarker {
  id: string;
  timeSec: number;
}

interface VideoPlayerProps {
  src: string;
  poster?: string;
  title?: string | null;
  artist?: string | null;
  chapters?: readonly ChapterCue[];
  noteMarkers?: readonly NoteMarker[];
  active?: boolean;
  width?: number | null;
  height?: number | null;
  onRatio?: (ratio: number) => void;
  onError?: () => void;
}

function MediaBridge({
  active,
  title,
  artist,
  artworkUrl,
}: {
  active: boolean;
  title?: string | null;
  artist?: string | null;
  artworkUrl?: string;
}) {
  const { state, actions } = useVideo();
  const { seek, seekBy, play, pause } = actions;
  const { currentTime, playing, duration, rate } = state;

  useMediaSession(
    { title, artist, artworkUrl },
    { active, playing, currentTime, duration, rate },
    { play, pause, seek, seekBy },
  );

  useEffect(() => {
    if (active) play();
    else pause();
  }, [active, play, pause]);

  useEffect(() => {
    if (!active) return;
    const handle = (seconds: number) => {
      seek(seconds);
      play();
    };
    setActiveMediaSeek(handle);
    return () => clearActiveMediaSeek(handle);
  }, [active, seek, play]);

  useEffect(() => {
    if (active) setActiveMediaTime(currentTime);
  }, [active, currentTime]);

  return null;
}

function EndPoster({ src }: { src?: string }) {
  const { state } = useVideo();
  if (!src || !state.ended) return null;
  return (
    <img src={src} alt="" className={styles["end-poster"]} draggable={false} />
  );
}

function NoteMarkers({ markers }: { markers: readonly NoteMarker[] }) {
  const { state, actions } = useVideo();
  if (markers.length === 0 || state.duration <= 0) return null;
  return (
    <div className={styles.markers} aria-hidden>
      {markers.map((marker) => {
        const pct = Math.min(
          100,
          Math.max(0, (marker.timeSec / state.duration) * 100),
        );
        return (
          <button
            key={marker.id}
            type="button"
            className={styles.marker}
            style={{ left: `${pct}%` }}
            tabIndex={-1}
            onClick={(e) => {
              e.stopPropagation();
              actions.seek(marker.timeSec);
              actions.play();
            }}
          />
        );
      })}
    </div>
  );
}

function useChaptersTrackUrl(chapters?: readonly ChapterCue[]): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    const next =
      chapters && chapters.length > 0 ? chaptersToVttUrl(chapters) : null;
    setUrl(next);
    return () => {
      if (next) URL.revokeObjectURL(next);
    };
  }, [chapters]);
  return url;
}

export function VideoPlayer({
  src,
  poster,
  title,
  artist,
  chapters,
  noteMarkers,
  active,
  width,
  height,
  onRatio,
  onError,
}: VideoPlayerProps) {
  const trackUrl = useChaptersTrackUrl(chapters);

  const [ratio, setRatio] = useState<number | null>(
    width && height ? width / height : null,
  );

  useEffect(() => {
    if (width && height) setRatio(width / height);
  }, [width, height]);

  useEffect(() => {
    if (ratio && onRatio) onRatio(ratio);
  }, [ratio, onRatio]);

  const onLoadedMetadata = useCallback<ReactEventHandler<HTMLVideoElement>>(
    (event) => {
      const video = event.currentTarget;
      if (video.videoWidth && video.videoHeight) {
        setRatio(video.videoWidth / video.videoHeight);
      }
    },
    [],
  );

  return (
    <Video.Root>
      <MediaBridge
        active={!!active}
        title={title}
        artist={artist}
        artworkUrl={poster}
      />
      <Video.Media
        src={src}
        preload="metadata"
        onError={onError}
        onLoadedMetadata={onLoadedMetadata}
      >
        {trackUrl ? (
          <track kind="chapters" src={trackUrl} default label="Chapters" />
        ) : null}
      </Video.Media>
      <EndPoster src={poster} />
      <Video.Controls>
        <Video.TimeDisplay />
        <Video.Row className={styles.scrubRow}>
          <Video.Scrubber />
          {noteMarkers && noteMarkers.length > 0 ? (
            <NoteMarkers markers={noteMarkers} />
          ) : null}
        </Video.Row>
        <Video.Row>
          <Video.PlayButton />
          <Video.Volume />
          <Video.Spacer />
          <Video.SpeedSelect />
          <Video.FullscreenButton />
        </Video.Row>
      </Video.Controls>
    </Video.Root>
  );
}
