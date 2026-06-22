import { useVideo, Video } from "@pond/ui";
import { useEffect, useState } from "react";
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
  onError?: () => void;
}

// Lives inside Video.Root so it can read the player context; pushes the seek
// action and time to the active-media store while this slide is active.
function MediaBridge({ active }: { active: boolean }) {
  const { state, actions } = useVideo();
  const { seek, play } = actions;
  const { currentTime } = state;

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
  onError,
}: VideoPlayerProps) {
  const trackUrl = useChaptersTrackUrl(chapters);

  return (
    <Video.Root>
      {active ? <MediaBridge active={active} /> : null}
      <Video.Media
        src={src}
        poster={poster}
        preload="metadata"
        onError={onError}
      >
        {trackUrl ? (
          <track kind="chapters" src={trackUrl} default label="Chapters" />
        ) : null}
      </Video.Media>
      <Video.Controls>
        <Video.PlayButton />
        <Video.Volume />
        <Video.CurrentTime />
        <Video.Scrubber />
        <Video.Duration />
        <Video.SpeedSelect />
        <Video.PiPButton />
        <Video.FullscreenButton />
      </Video.Controls>
    </Video.Root>
  );
}
