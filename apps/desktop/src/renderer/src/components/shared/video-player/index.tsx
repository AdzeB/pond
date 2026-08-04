import { useVideo, Video } from "@pond/ui";
import {
  type ReactEventHandler,
  useCallback,
  useEffect,
  useState,
} from "react";
import { useMediaSession } from "@/hooks/use-media-session";
import { type ChapterCue, chaptersToVttUrl } from "@/lib/media/chapters-vtt";
import {
  clearActiveMediaSeek,
  setActiveMediaSeek,
  setActiveMediaTime,
} from "@/stores/active-media";
import styles from "./styles.module.css";

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
  /** Publishes the seek handle and current time to the active-media store so out-of-tree chrome can drive this player. */
  active?: boolean;
  /** Seeds the aspect ratio so it's known before metadata loads. */
  width?: number | null;
  height?: number | null;
  /** Reports the resolved aspect ratio so the slide can size its box; the player doesn't know the slide layout. */
  onRatio?: (ratio: number) => void;
  onError?: () => void;
}

/** Lives inside Video.Root so it can read the player context and push seek/time to the active-media store. */
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

  /** Only one video ever plays; keyed on `active` so a manual pause isn't overridden. */
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

/** The object URL is revoked when chapters change or the player unmounts. */
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

/** Desktop skin over the @pond/ui Video compound parts; playback, controls, and hotkeys live in @pond/ui. */
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

  /** Seeded from stored dimensions, then corrected to the true frame ratio on load so the slide's box avoids letterboxing. */
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
        poster={poster}
        preload="metadata"
        onError={onError}
        onLoadedMetadata={onLoadedMetadata}
      >
        {trackUrl ? (
          <track kind="chapters" src={trackUrl} default label="Chapters" />
        ) : null}
      </Video.Media>
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
