import { useVideo, Video } from "@pond/ui";
import {
  type ReactEventHandler,
  useCallback,
  useEffect,
  useState,
} from "react";
import { type ChapterCue, chaptersToVttUrl } from "@/lib/chapters-vtt";
import {
  clearActiveMediaSeek,
  setActiveMediaSeek,
  setActiveMediaTime,
} from "@/stores/active-media";

interface VideoPlayerProps {
  src: string;
  poster?: string;
  chapters?: readonly ChapterCue[];
  // When set, this player publishes its seek handle + current time to the
  // active-media store so out-of-tree chrome (the detail chapter list) can
  // drive it. The carousel marks only the in-view slide active.
  active?: boolean;
  // Intrinsic media dimensions; seed the aspect ratio so it's known before
  // metadata loads and reported through onRatio.
  width?: number | null;
  height?: number | null;
  // Reports the resolved aspect ratio (from props or loaded metadata) so the
  // slide can size its box; the player itself doesn't know the slide layout.
  onRatio?: (ratio: number) => void;
  onError?: () => void;
}

// Lives inside Video.Root so it can read the player context; pushes the seek
// action and time to the active-media store while this slide is active.
function MediaBridge({ active }: { active: boolean }) {
  const { state, actions } = useVideo();
  const { seek, play, pause } = actions;
  const { currentTime } = state;

  // Autoplay the active (centered, in-view) slide and pause the rest so only
  // one video ever plays. Keyed on `active` so a manual pause isn't overridden.
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

// Build an object-URL WebVTT chapters track, revoked when chapters change or the player unmounts.
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

// Desktop skin composing the @pond/ui Video compound parts; playback/controls/hotkeys live in @pond/ui.
export function VideoPlayer({
  src,
  poster,
  chapters,
  active,
  width,
  height,
  onRatio,
  onError,
}: VideoPlayerProps) {
  const trackUrl = useChaptersTrackUrl(chapters);

  // Seeded from the stored dimensions, then corrected to the true frame ratio
  // on load and reported so the slide can size its box without letterboxing.
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
      <MediaBridge active={!!active} />
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
        <Video.Row>
          <Video.CurrentTime />
          <Video.Scrubber />
          <Video.Duration />
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
