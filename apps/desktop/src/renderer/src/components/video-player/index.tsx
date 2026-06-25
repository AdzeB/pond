import { useVideo, Video } from "@pond/ui";
import {
  type ReactEventHandler,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { type ChapterCue, chaptersToVttUrl } from "@/lib/chapters-vtt";
import {
  clearActiveMediaSeek,
  setActiveMediaSeek,
  setActiveMediaTime,
} from "@/stores/active-media";
import styles from "./styles.module.css";

interface VideoPlayerProps {
  src: string;
  poster?: string;
  chapters?: readonly ChapterCue[];
  // When set, this player publishes its seek handle + current time to the
  // active-media store so out-of-tree chrome (the detail chapter list) can
  // drive it. The carousel marks only the in-view slide active.
  active?: boolean;
  // Intrinsic media dimensions, used to size the player to the video's
  // contained box so the controls track the video width (not the slide).
  width?: number | null;
  height?: number | null;
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
  width,
  height,
  onError,
}: VideoPlayerProps) {
  const trackUrl = useChaptersTrackUrl(chapters);

  // Size the player to the video's contained box so the controls stop at the
  // video edges. Ratio comes from the known dimensions, else from metadata.
  const fitRef = useRef<HTMLDivElement>(null);
  const [ratio, setRatio] = useState<number | null>(
    width && height ? width / height : null,
  );
  const [box, setBox] = useState<{ width: number; height: number } | null>(
    null,
  );

  useEffect(() => {
    if (width && height) setRatio(width / height);
  }, [width, height]);

  useLayoutEffect(() => {
    const el = fitRef.current;
    if (!el || !ratio) return;
    const compute = () => {
      const aw = el.clientWidth;
      const ah = el.clientHeight;
      if (aw === 0 || ah === 0) return;
      let w = aw;
      let h = aw / ratio;
      if (h > ah) {
        h = ah;
        w = ah * ratio;
      }
      setBox({ width: Math.round(w), height: Math.round(h) });
    };
    compute();
    const observer = new ResizeObserver(compute);
    observer.observe(el);
    return () => observer.disconnect();
  }, [ratio]);

  const onLoadedMetadata = useCallback<ReactEventHandler<HTMLVideoElement>>(
    (event) => {
      if (ratio) return;
      const video = event.currentTarget;
      if (video.videoWidth && video.videoHeight) {
        setRatio(video.videoWidth / video.videoHeight);
      }
    },
    [ratio],
  );

  return (
    <div ref={fitRef} className={styles.fit}>
      <Video.Root
        style={box ? { width: box.width, height: box.height } : undefined}
      >
        {active ? <MediaBridge active={active} /> : null}
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
          <Video.PlayButton />
          <Video.Volume />
          <Video.CurrentTime />
          <Video.Scrubber />
          <Video.Duration />
          <Video.SpeedSelect />
          <Video.FullscreenButton />
        </Video.Controls>
      </Video.Root>
    </div>
  );
}
