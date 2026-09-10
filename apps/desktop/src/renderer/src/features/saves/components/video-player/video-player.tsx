import { stepPlaybackRate, stepVolume, useVideo, Video } from "@pond/ui";
import { useHotkey } from "@tanstack/react-hotkeys";
import {
  type ReactEventHandler,
  useCallback,
  useEffect,
  useState,
} from "react";
import { useMediaSession } from "@/features/saves/hooks/use-media-session";
import { useSave } from "@/features/saves/hooks/use-saves";
import {
  type ChapterCue,
  chaptersToVttUrl,
} from "@/features/saves/lib/media/chapters-vtt";
import { buildPondUrl } from "@/features/saves/lib/media/url";
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
  saveId?: string;
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
  const videoHotkeys = { enabled: active, ignoreInputs: true };
  useHotkey(
    ".",
    () => actions.setRate(stepPlaybackRate(rate, 1)),
    videoHotkeys,
  );
  useHotkey(
    ",",
    () => actions.setRate(stepPlaybackRate(rate, -1)),
    videoHotkeys,
  );
  useHotkey(
    "Shift+ArrowUp",
    () => actions.setVolume(stepVolume(state.volume, 0.05)),
    videoHotkeys,
  );
  useHotkey(
    "Shift+ArrowDown",
    () => actions.setVolume(stepVolume(state.volume, -0.05)),
    videoHotkeys,
  );

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
  saveId,
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
  const save = useSave(saveId);
  const trackUrl = useChaptersTrackUrl(chapters);
  const subtitle = save?.files.find((file) => file.kind === "subtitle");
  const subtitleUrl = save && subtitle ? buildPondUrl(save.id, subtitle) : null;

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
        {subtitleUrl ? (
          <track kind="subtitles" src={subtitleUrl} default label="Subtitles" />
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
