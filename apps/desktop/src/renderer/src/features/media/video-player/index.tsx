import { Video } from "@pond/ui";
import { useEffect, useState } from "react";
import { type ChapterCue, chaptersToVttUrl } from "./chapters-vtt";

interface VideoPlayerProps {
  src: string;
  poster?: string;
  chapters?: readonly ChapterCue[];
  onError?: () => void;
}

// Builds an object-URL WebVTT chapters track and revokes it when the chapters
// change or the player unmounts.
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

// The desktop "skin": composes the @pond/ui Video compound parts into the
// player layout. All playback/controls/hotkeys live in @pond/ui.
export function VideoPlayer({
  src,
  poster,
  chapters,
  onError,
}: VideoPlayerProps) {
  const trackUrl = useChaptersTrackUrl(chapters);

  return (
    <Video.Root>
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
