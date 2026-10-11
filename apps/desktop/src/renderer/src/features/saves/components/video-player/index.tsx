import { useVideo, Video } from "@pond/ui";
import {
  type ReactEventHandler,
  type ReactNode,
  useCallback,
  useEffect,
  useState,
} from "react";
import { ChromePortal } from "@/features/saves/components/viewers/media-viewer/chrome";
import { useSave } from "@/features/saves/hooks/use-saves";
import type { ChapterCue } from "@/features/saves/lib/media/chapters-vtt";
import { buildPondUrl } from "@/features/saves/lib/media/url";
import { viewerMemory } from "@/features/saves/lib/viewer-memory";
import { EndPoster } from "./end-poster";
import { videoScaleForRotation } from "./geometry";
import { MediaBridge } from "./media-bridge";
import styles from "./styles.module.css";
import { TimelinePreview } from "./timeline-preview";
import { PlayerButton } from "./toolbar-buttons";
import { VideoToolbarContent, type VideoToolbarSlots } from "./toolbar-content";
import { useChaptersTrackUrl } from "./use-chapters-track-url";
import { VolumeControl } from "./volume";
import { WheelBridge } from "./wheel-bridge";

interface VideoPlayerProps {
  src: string;
  saveId?: string;
  fileIndex?: number;
  poster?: string;
  title?: string | null;
  artist?: string | null;
  chapters?: readonly ChapterCue[];
  active?: boolean;
  width?: number | null;
  height?: number | null;
  onRatio?: (ratio: number) => void;
  onError?: () => void;
  renderToolbar?: (slots: VideoToolbarSlots) => ReactNode;
}

function VideoSurface({
  src,
  trackUrl,
  subtitleUrl,
  rotation,
  mirrored,
  ratio,
  onError,
  onLoadedMetadata,
}: {
  src: string;
  trackUrl: string | null;
  subtitleUrl: string | null;
  rotation: number;
  mirrored: boolean;
  ratio: number | null;
  onError?: () => void;
  onLoadedMetadata: ReactEventHandler<HTMLVideoElement>;
}) {
  const { meta } = useVideo();
  const [viewerSize, setViewerSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const root = meta.rootRef.current;
    if (!root) return;
    const update = () =>
      setViewerSize({ width: root.clientWidth, height: root.clientHeight });
    update();
    const observer = new ResizeObserver(update);
    observer.observe(root);
    return () => observer.disconnect();
  }, [meta.rootRef]);
  const scale = videoScaleForRotation(
    viewerSize.width,
    viewerSize.height,
    ratio,
    rotation,
  );
  return (
    <Video.Media
      className={styles.media}
      src={src}
      preload="metadata"
      onError={onError}
      onLoadedMetadata={onLoadedMetadata}
      style={{
        objectFit: "contain",
        transform: `scale(${scale}) rotate(${rotation}deg) scaleX(${mirrored ? -1 : 1})`,
      }}
    >
      {trackUrl ? (
        <track kind="chapters" src={trackUrl} default label="Chapters" />
      ) : null}
      {subtitleUrl ? (
        <track kind="subtitles" src={subtitleUrl} default label="Subtitles" />
      ) : null}
    </Video.Media>
  );
}

export function VideoPlayer({
  src,
  saveId,
  fileIndex = 0,
  poster,
  title,
  artist,
  chapters,
  active,
  width,
  height,
  onRatio,
  onError,
  renderToolbar,
}: VideoPlayerProps) {
  const save = useSave(saveId);
  const trackUrl = useChaptersTrackUrl(chapters);
  const subtitle = save?.files.find((file) => file.kind === "subtitle");
  const subtitleUrl = save && subtitle ? buildPondUrl(save.id, subtitle) : null;
  const [frameRate, setFrameRate] = useState<number | null>(null);
  const [loopRange, setLoopRange] = useState<[number, number] | null>(() =>
    viewerMemory.loop(src),
  );
  useEffect(() => {
    setFrameRate(null);
    setLoopRange(viewerMemory.loop(src));
    if (!saveId) return;
    let current = true;
    void window.pond
      .query("saves.mediaTiming", { id: saveId, fileIndex })
      .then((timing) => {
        if (current) setFrameRate(timing.frameRate);
      })
      .catch(() => {});
    return () => {
      current = false;
    };
  }, [saveId, fileIndex, src]);
  const changeLoop = (range: [number, number] | null) => {
    viewerMemory.setLoop(src, range);
    setLoopRange(range);
  };

  const [loopOverride, setLoopOverride] = useState<{
    src: string;
    enabled: boolean;
  } | null>(null);
  const activeLoopOverride =
    loopOverride?.src === src ? loopOverride.enabled : null;
  const [rotation, setRotation] = useState(0);
  const [mirrored, setMirrored] = useState(false);

  const [ratio, setRatio] = useState<number | null>(
    width && height ? width / height : null,
  );
  const sizeKey = `${width}x${height}`;
  const [ratioSizeKey, setRatioSizeKey] = useState(sizeKey);
  if (sizeKey !== ratioSizeKey) {
    setRatioSizeKey(sizeKey);
    if (width && height) setRatio(width / height);
  }

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
    <Video.Root frameRate={frameRate} chrome>
      <MediaBridge
        key={src}
        src={src}
        active={!!active}
        title={title}
        artist={artist}
        artworkUrl={poster}
        loopRange={loopRange}
        loopOverride={activeLoopOverride}
      />
      <WheelBridge />
      <VideoSurface
        src={src}
        trackUrl={trackUrl}
        subtitleUrl={subtitleUrl}
        rotation={rotation}
        mirrored={mirrored}
        ratio={ratio}
        onError={onError}
        onLoadedMetadata={onLoadedMetadata}
      />
      <EndPoster src={poster} />
      {active ? (
        <>
          <VideoToolbarContent
            save={save}
            fileIndex={fileIndex}
            mirrored={mirrored}
            onMirror={() => setMirrored((value) => !value)}
            onRotate={() => setRotation((value) => (value + 90) % 360)}
            render={renderToolbar}
          />
          <ChromePortal slot="bottom">
            <Video.Controls
              className={styles.controls}
              role="toolbar"
              aria-label="Playback"
            >
              <Video.Row className={styles.row}>
                <PlayerButton.Playback />
                <VolumeControl />
                <Video.CurrentTime
                  className={styles["current-time"]}
                  aria-label="Elapsed time"
                />
                <div className={styles.timeline}>
                  <Video.Scrubber
                    renderPreview={(time) => (
                      <TimelinePreview src={src} time={time} />
                    )}
                  />
                </div>
                <Video.Duration
                  className={styles.duration}
                  aria-label="Duration"
                />
                <Video.SpeedSelect />
                <PlayerButton.Loop
                  range={loopRange}
                  override={activeLoopOverride}
                  onRangeChange={changeLoop}
                  onOverrideChange={(enabled) =>
                    setLoopOverride({ src, enabled })
                  }
                />
                <PlayerButton.Fullscreen />
              </Video.Row>
            </Video.Controls>
          </ChromePortal>
        </>
      ) : null}
    </Video.Root>
  );
}
