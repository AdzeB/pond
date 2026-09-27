import {
  IconAnimationRepeatOutline18,
  IconArrowsExpandOutline18,
  IconCaretLeftToLineOutline18,
  IconCaretRightToLineOutline18,
  IconClone2Outline18,
  IconFlipHorizontal2Outline18,
  IconFloppyDiskOutline18,
  IconFullScreenOutline18,
  IconImagePlusOutline18,
  IconMediaPlayOutline18,
  IconNotepadOutline18,
  IconResizeXOutline18,
  IconRotateImageClockwiseOutline18,
  IconVolumeOffOutline18,
  IconVolumeOutline18,
} from "@pond/icons/outline/18";
import {
  Button,
  Dialog,
  Input,
  stepPlaybackRate,
  stepVolume,
  useVideo,
  Video,
} from "@pond/ui";
import { useHotkey } from "@tanstack/react-hotkeys";
import {
  type ReactEventHandler,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { VideoCommentsSection } from "@/features/saves/components/detail/video-notes";
import { ViewerHud } from "@/features/saves/components/viewers/hud";
import { ChromePortal } from "@/features/saves/components/viewers/media-viewer/chrome/chrome";
import { OriginalFileActions } from "@/features/saves/components/viewers/original-file-actions";
import { useMediaSession } from "@/features/saves/hooks/use-media-session";
import { useSave } from "@/features/saves/hooks/use-saves";
import {
  copyVideoFrame,
  saveVideoFrame,
  setVideoThumbnail,
} from "@/features/saves/lib/media/capture-frame";
import {
  type ChapterCue,
  chaptersToVttUrl,
} from "@/features/saves/lib/media/chapters-vtt";
import { buildPondUrl } from "@/features/saves/lib/media/url";
import { viewerMemory } from "@/features/saves/lib/viewer-memory";
import {
  clearActiveMediaSeek,
  setActiveMediaSeek,
  setActiveMediaTime,
} from "@/features/saves/state/active-media";
import type { Save } from "@/features/saves/types";
import { usePrefs } from "@/features/settings/state/prefs";
import { ShortcutKeys } from "@/shared/components/shortcut-keys";
import { bindingKeys, useShortcutBindings } from "@/shared/lib/shortcuts";
import { videoScaleForRotation } from "./geometry";
import styles from "./styles.module.css";

export interface NoteMarker {
  fileIndex?: number;
  id: string;
  timeSec: number;
}

export interface VideoToolbarSlots {
  actions: ReactNode;
  edits: ReactNode;
  view: ReactNode;
}

interface VideoPlayerProps {
  src: string;
  saveId?: string;
  fileIndex?: number;
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
  renderToolbar?: (slots: VideoToolbarSlots) => ReactNode;
}

function MediaBridge({
  src,
  active,
  title,
  artist,
  artworkUrl,
  loopRange,
  looped,
}: {
  src: string;
  active: boolean;
  title?: string | null;
  artist?: string | null;
  artworkUrl?: string;
  loopRange: [number, number] | null;
  looped: boolean;
}) {
  const [prefs] = usePrefs("viewer");
  const shortcuts = useShortcutBindings();
  const lastSavedSecond = useRef(-1);
  const restored = useRef(false);
  const { state, actions, meta } = useVideo();
  const { seek, seekBy, play, pause } = actions;
  const { currentTime, playing, duration, rate } = state;
  useEffect(() => {
    if (meta.videoRef.current)
      meta.videoRef.current.loop =
        looped ||
        (!loopRange &&
          prefs.loopShortVideos !== false &&
          duration > 0 &&
          duration < 30);
  }, [duration, looped, meta.videoRef, prefs.loopShortVideos, loopRange]);

  useEffect(() => {
    if (!active || !playing || !loopRange || loopRange[1] > duration) return;
    const video = meta.videoRef.current;
    if (!video) return;
    let request = 0;
    const loop = () => {
      if (video.currentTime >= loopRange[1] || video.currentTime < loopRange[0])
        video.currentTime = loopRange[0];
      request = requestAnimationFrame(loop);
    };
    request = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(request);
  }, [active, playing, loopRange, duration, meta.videoRef]);

  useEffect(() => {
    const video = meta.videoRef.current;
    if (!active || !video || !loopRange || loopRange[1] > duration) return;
    const restart = () => {
      video.currentTime = loopRange[0];
      void video.play().catch(() => {});
    };
    video.addEventListener("ended", restart);
    return () => video.removeEventListener("ended", restart);
  }, [active, loopRange, duration, meta.videoRef]);

  useEffect(() => {
    if (restored.current || duration <= 0) return;
    restored.current = true;
    if (prefs.rememberPlayback !== false) {
      const position = viewerMemory.playback(src);
      if (position > 0 && position < duration - 1) seek(position);
    }
  }, [duration, prefs.rememberPlayback, seek, src]);
  useEffect(() => {
    if (prefs.rememberPlayback === false || !restored.current || duration <= 0)
      return;
    const position = meta.videoRef.current?.currentTime ?? currentTime;
    const second = Math.floor(position);
    if (second !== lastSavedSecond.current) {
      lastSavedSecond.current = second;
      viewerMemory.setPlayback(src, position >= duration - 1 ? 0 : position);
    }
  }, [currentTime, duration, prefs.rememberPlayback, src, meta.videoRef]);
  useHotkey(
    bindingKeys(shortcuts, "viewer.play-pause"),
    (event) => {
      event.preventDefault();
      actions.showControls();
      actions.togglePlay();
    },
    { enabled: active, ignoreInputs: true },
  );
  useHotkey(
    bindingKeys(shortcuts, "viewer.frame-prev"),
    () => actions.stepFrame(-1),
    {
      enabled: active,
      ignoreInputs: true,
    },
  );
  useHotkey(
    bindingKeys(shortcuts, "viewer.frame-next"),
    () => actions.stepFrame(1),
    {
      enabled: active,
      ignoreInputs: true,
    },
  );
  useHotkey(
    bindingKeys(shortcuts, "viewer.frame-prev-ten"),
    () => actions.stepFrame(-10),
    { enabled: active, ignoreInputs: true },
  );
  useHotkey(
    bindingKeys(shortcuts, "viewer.frame-next-ten"),
    () => actions.stepFrame(10),
    { enabled: active, ignoreInputs: true },
  );
  useHotkey(bindingKeys(shortcuts, "viewer.seek-back"), () => seekBy(-10), {
    enabled: active,
    ignoreInputs: true,
  });
  useHotkey(bindingKeys(shortcuts, "viewer.seek-forward"), () => seekBy(10), {
    enabled: active,
    ignoreInputs: true,
  });
  const videoHotkeys = { enabled: active, ignoreInputs: true };
  useHotkey(
    bindingKeys(shortcuts, "viewer.speed-up"),
    () => actions.setRate(stepPlaybackRate(rate, 1)),
    videoHotkeys,
  );
  useHotkey(
    bindingKeys(shortcuts, "viewer.speed-down"),
    () => actions.setRate(stepPlaybackRate(rate, -1)),
    videoHotkeys,
  );
  useHotkey(
    bindingKeys(shortcuts, "viewer.volume-up"),
    () => actions.setVolume(stepVolume(state.volume, 0.05)),
    videoHotkeys,
  );
  useHotkey(
    bindingKeys(shortcuts, "viewer.volume-down"),
    () => actions.setVolume(stepVolume(state.volume, -0.05)),
    videoHotkeys,
  );

  useMediaSession(
    { title, artist, artworkUrl },
    { active, playing, currentTime, duration, rate },
    { play, pause, seek, seekBy },
  );

  useEffect(() => {
    if (active && prefs.autoplayVideo !== false) play();
    else pause();
  }, [active, play, pause, prefs.autoplayVideo]);

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

function WheelBridge() {
  const [prefs] = usePrefs("viewer");
  const { actions, meta, state } = useVideo();
  const volume = useRef(state.volume);
  volume.current = state.volume;

  useEffect(() => {
    const video = meta.videoRef.current;
    if (!video || prefs.videoWheelBehavior === "none") return;
    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      event.preventDefault();
      event.stopPropagation();
      const direction = event.deltaY > 0 ? -1 : 1;
      if (prefs.videoWheelBehavior === "volume") {
        actions.setVolume(stepVolume(volume.current, direction * 0.05));
      } else {
        actions.seekBy(-direction * 5);
      }
      actions.showControls();
    };
    video.addEventListener("wheel", onWheel, { passive: false });
    return () => video.removeEventListener("wheel", onWheel);
  }, [actions, meta.videoRef, prefs.videoWheelBehavior]);

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

function VideoSurface({
  src,
  trackUrl,
  subtitleUrl,
  rotation,
  mirrored,
  ratio,
  stretch,
  sizeMode,
  onError,
  onLoadedMetadata,
}: {
  src: string;
  trackUrl: string | null;
  subtitleUrl: string | null;
  rotation: number;
  mirrored: boolean;
  ratio: number | null;
  stretch: boolean;
  sizeMode: "fit" | "fill";
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
    stretch && viewerSize.height > 0
      ? viewerSize.width / viewerSize.height
      : ratio,
    rotation,
  );
  const fill = sizeMode === "fill";
  return (
    <Video.Media
      className={styles.media}
      src={src}
      preload="metadata"
      onError={onError}
      onLoadedMetadata={onLoadedMetadata}
      style={{
        width: fill ? "100%" : undefined,
        height: fill ? "100%" : undefined,
        objectFit: fill ? "cover" : stretch ? "fill" : "contain",
        transform: `scale(${fill ? 1 : scale}) rotate(${rotation}deg) scaleX(${mirrored ? -1 : 1})`,
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
  noteMarkers,
  active,
  width,
  height,
  onRatio,
  onError,
  renderToolbar,
}: VideoPlayerProps) {
  const [prefs] = usePrefs("viewer");
  const [notesOpen, setNotesOpen] = useState(false);
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

  const [looped, setLooped] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [mirrored, setMirrored] = useState(false);
  const [sizeMode, setSizeMode] = useState<"fit" | "fill">("fit");

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
    <Video.Root frameRate={frameRate} chrome>
      <MediaBridge
        key={src}
        src={src}
        active={!!active}
        title={title}
        artist={artist}
        artworkUrl={poster}
        loopRange={loopRange}
        looped={looped}
      />
      <WheelBridge />
      <VideoSurface
        src={src}
        trackUrl={trackUrl}
        subtitleUrl={subtitleUrl}
        rotation={rotation}
        mirrored={mirrored}
        ratio={ratio}
        stretch={prefs.stretchVideo}
        sizeMode={sizeMode}
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
            onComments={() => setNotesOpen(true)}
            onMirror={() => setMirrored((value) => !value)}
            onRotate={() => setRotation((value) => (value + 90) % 360)}
            sizing={sizeMode}
            onFill={() => setSizeMode("fill")}
            onFit={() => setSizeMode("fit")}
            render={renderToolbar}
          />
          <ChromePortal slot="bottom">
            <ViewerHud.Tools
              tooltipSide="top"
              className={styles.transport}
              role="toolbar"
              aria-label="Playback"
            >
              <Video.Controls className={styles.controls}>
                <Video.Row className={styles.row}>
                  <PlaybackButton />
                  <SeekControls />
                  <VolumeControl />
                  <Video.TimeDisplay className={styles.timeDisplay} />
                  <div className={styles.timeline}>
                    <Video.Scrubber
                      renderPreview={(time) => (
                        <TimelinePreview src={src} time={time} ratio={ratio} />
                      )}
                    />
                    {noteMarkers && noteMarkers.length > 0 ? (
                      <NoteMarkers
                        markers={noteMarkers.filter(
                          (note) => (note.fileIndex ?? 0) === fileIndex,
                        )}
                      />
                    ) : null}
                  </div>
                  <Video.SpeedSelect />
                  <ViewerHud.Tool
                    label="Loop"
                    pressed={looped || !!loopRange}
                    onClick={() => {
                      if (loopRange) {
                        changeLoop(null);
                        setLooped(false);
                        return;
                      }
                      setLooped((value) => !value);
                    }}
                  >
                    <IconAnimationRepeatOutline18 />
                  </ViewerHud.Tool>
                  <FullscreenButton />
                </Video.Row>
              </Video.Controls>
            </ViewerHud.Tools>
          </ChromePortal>
        </>
      ) : null}
      {notesOpen && save ? (
        <Dialog.Root open onOpenChange={setNotesOpen}>
          <Dialog.Portal>
            <Dialog.Backdrop />
            <Dialog.Popup>
              <Dialog.Header>
                <Dialog.Title>Comments</Dialog.Title>
                <Dialog.Close />
              </Dialog.Header>
              <div className={styles.notes}>
                <LoopControls
                  key={src}
                  range={loopRange}
                  onChange={changeLoop}
                />
                <VideoCommentsSection save={save} fileIndex={fileIndex} />
              </div>
            </Dialog.Popup>
          </Dialog.Portal>
        </Dialog.Root>
      ) : null}
    </Video.Root>
  );
}

function PlaybackButton() {
  const { state, actions } = useVideo();
  return (
    <ViewerHud.Tool
      label={state.playing ? "Pause" : "Play"}
      shortcut={<ShortcutKeys id="viewer.play-pause" />}
      onClick={actions.togglePlay}
    >
      {state.playing ? <PauseIcon /> : <IconMediaPlayOutline18 />}
    </ViewerHud.Tool>
  );
}

function PauseIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      aria-hidden
      data-pause-icon
    >
      <line
        x1="6"
        y1="4"
        x2="6"
        y2="14"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1="12"
        y1="4"
        x2="12"
        y2="14"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MuteButton() {
  const { state, actions } = useVideo();
  const muted = state.muted || state.volume === 0;
  return (
    <ViewerHud.Tool
      label={muted ? "Unmute" : "Mute"}
      shortcut={<ShortcutKeys id="viewer.mute" />}
      onClick={actions.toggleMute}
    >
      {muted ? <IconVolumeOffOutline18 /> : <IconVolumeOutline18 />}
    </ViewerHud.Tool>
  );
}

function VolumeControl() {
  return (
    <div className={styles.volumeControl} data-video-volume-control>
      <MuteButton />
      <div className={styles.volumePopover} data-video-volume-popover>
        <VolumeSlider />
      </div>
    </div>
  );
}

function VolumeSlider() {
  const { state, actions } = useVideo();
  return (
    <input
      type="range"
      className={styles.volume}
      aria-label="Video Volume"
      min={0}
      max={1}
      step={0.05}
      value={state.volume}
      onChange={(event) => {
        const next = Number(event.currentTarget.value);
        if (state.muted && next > 0) actions.toggleMute();
        actions.setVolume(next);
      }}
    />
  );
}

function FullscreenButton() {
  const { state, actions } = useVideo();
  if (!state.fullscreenSupported) return null;
  return (
    <ViewerHud.Tool
      label={state.fullscreen ? "Exit full screen" : "Full screen"}
      onClick={actions.toggleFullscreen}
    >
      <IconFullScreenOutline18 />
    </ViewerHud.Tool>
  );
}

function TimelinePreview({
  src,
  time,
  ratio,
}: {
  src: string;
  time: number;
  ratio: number | null;
}) {
  const preview = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);

  const seek = useCallback(
    (video: HTMLVideoElement) => {
      if (!Number.isFinite(video.duration) || video.duration <= 0) return;
      setReady(false);
      video.currentTime = Math.min(time, Math.max(0, video.duration - 0.001));
    },
    [time],
  );

  useEffect(() => {
    const video = preview.current;
    if (!video || video.readyState < HTMLMediaElement.HAVE_METADATA) return;
    const request = requestAnimationFrame(() => seek(video));
    return () => cancelAnimationFrame(request);
  }, [seek]);

  return (
    <video
      ref={preview}
      src={src}
      className={styles.timelinePreview}
      style={{ aspectRatio: ratio ?? undefined }}
      preload="metadata"
      muted
      playsInline
      aria-hidden
      data-ready={ready || undefined}
      onLoadedMetadata={(event) => seek(event.currentTarget)}
      onSeeked={() => setReady(true)}
    />
  );
}

function VideoToolbarContent({
  save,
  fileIndex,
  mirrored,
  onComments,
  onMirror,
  onRotate,
  sizing,
  onFill,
  onFit,
  render,
}: {
  save: Save | undefined;
  fileIndex: number;
  mirrored: boolean;
  onComments: () => void;
  onMirror: () => void;
  onRotate: () => void;
  sizing: "fit" | "fill";
  onFill: () => void;
  onFit: () => void;
  render?: (slots: VideoToolbarSlots) => ReactNode;
}) {
  const { meta, state } = useVideo();
  const file = save?.files[fileIndex];
  const videoReady = state.duration > 0 && Boolean(meta.videoRef.current);
  const withVideo = (action: (video: HTMLVideoElement) => void) => {
    const video = meta.videoRef.current;
    if (video) action(video);
  };

  if (!render) return null;

  return render({
    actions: (
      <>
        <ViewerHud.Tool
          label="Copy Current Frame"
          shortcut={<ShortcutKeys id="viewer.copy-frame" />}
          disabled={!videoReady}
          onClick={() => withVideo((video) => void copyVideoFrame(video))}
        >
          <IconClone2Outline18 />
        </ViewerHud.Tool>
        <ViewerHud.Tool
          label="Save Current Frame"
          shortcut={<ShortcutKeys id="viewer.save-frame" />}
          disabled={!videoReady}
          onClick={() => withVideo((video) => void saveVideoFrame(video))}
        >
          <IconFloppyDiskOutline18 />
        </ViewerHud.Tool>
        {save ? (
          <ViewerHud.Tool
            label="Set Current Frame as Thumbnail"
            disabled={!videoReady}
            onClick={() =>
              withVideo((video) => void setVideoThumbnail(save.id, video))
            }
          >
            <IconImagePlusOutline18 />
          </ViewerHud.Tool>
        ) : null}
        {save ? (
          <ViewerHud.Tool label="Comments" onClick={onComments}>
            <IconNotepadOutline18 />
          </ViewerHud.Tool>
        ) : null}
        {save && file ? (
          <OriginalFileActions save={save} fileIndex={fileIndex} />
        ) : null}
      </>
    ),
    edits: (
      <>
        <ViewerHud.Tool label="Rotate Video" onClick={onRotate}>
          <IconRotateImageClockwiseOutline18 />
        </ViewerHud.Tool>
        <ViewerHud.Tool
          label="Mirror Video"
          pressed={mirrored}
          onClick={onMirror}
        >
          <IconFlipHorizontal2Outline18 />
        </ViewerHud.Tool>
      </>
    ),
    view: (
      <>
        <ViewerHud.Tool
          label="Fill"
          pressed={sizing === "fill"}
          disabled={!videoReady}
          onClick={onFill}
        >
          <IconArrowsExpandOutline18 />
        </ViewerHud.Tool>
        <ViewerHud.Tool
          label="Fit"
          pressed={sizing === "fit"}
          disabled={!videoReady}
          onClick={onFit}
        >
          <IconResizeXOutline18 />
        </ViewerHud.Tool>
      </>
    ),
  });
}

function SeekControls() {
  const { actions } = useVideo();
  return (
    <>
      <ViewerHud.Tool
        label="Back"
        shortcut={<ShortcutKeys id="viewer.seek-back" />}
        onClick={() => actions.seekBy(-10)}
      >
        <IconCaretLeftToLineOutline18 />
      </ViewerHud.Tool>
      <ViewerHud.Tool
        label="Forward"
        shortcut={<ShortcutKeys id="viewer.seek-forward" />}
        onClick={() => actions.seekBy(10)}
      >
        <IconCaretRightToLineOutline18 />
      </ViewerHud.Tool>
    </>
  );
}

function LoopControls({
  range,
  onChange,
}: {
  range: [number, number] | null;
  onChange: (range: [number, number] | null) => void;
}) {
  const { state, actions } = useVideo();
  const [start, setStart] = useState(range?.[0] ?? 0);
  const [end, setEnd] = useState(range?.[1] ?? 0);
  const valid =
    Number.isFinite(start) &&
    Number.isFinite(end) &&
    start >= 0 &&
    end > start &&
    end <= state.duration;
  return (
    <Video.Row className={styles.loop}>
      <Input.Root>
        <Input.Field
          aria-label="Loop Start in Seconds"
          type="number"
          min={0}
          max={state.duration}
          step={0.001}
          value={start}
          onChange={(event) => {
            setStart(Number(event.target.value));
            onChange(null);
          }}
        />
      </Input.Root>
      <Button
        size="sm"
        variant="ghost"
        className={styles.controlButton}
        onClick={() => {
          setStart(state.currentTime);
          onChange(null);
        }}
      >
        Set Start
      </Button>
      <Input.Root>
        <Input.Field
          aria-label="Loop End in Seconds"
          type="number"
          min={0}
          max={state.duration}
          step={0.001}
          value={end}
          onChange={(event) => {
            setEnd(Number(event.target.value));
            onChange(null);
          }}
        />
      </Input.Root>
      <Button
        size="sm"
        variant="ghost"
        className={styles.controlButton}
        onClick={() => {
          setEnd(state.currentTime);
          onChange(null);
        }}
      >
        Set End
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className={styles.controlButton}
        disabled={!range && !valid}
        aria-pressed={!!range}
        onClick={() => {
          if (range) onChange(null);
          else {
            onChange([start, end]);
            actions.seek(start);
            actions.play();
          }
        }}
      >
        {range ? "Stop Loop" : "Loop Range"}
      </Button>
    </Video.Row>
  );
}
