import {
  IconAnimationRepeatFill18,
  IconFlipHorizontal2Fill18,
  IconMediaFastBackwardsFill18,
  IconMediaFastForwardFill18,
  IconNotepadFill18,
  IconRotateImageClockwiseFill18,
} from "@pond/icons/fill/18";
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
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { VideoNotesSection } from "@/features/saves/components/detail/video-notes";
import { ViewerHud } from "@/features/saves/components/viewers/hud";
import { ChromePortal } from "@/features/saves/components/viewers/media-viewer/chrome/chrome";
import { useMediaSession } from "@/features/saves/hooks/use-media-session";
import { useSave } from "@/features/saves/hooks/use-saves";
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
import { usePrefs } from "@/features/settings/state/prefs";
import { bindingKeys, useShortcutBindings } from "@/shared/lib/shortcuts";
import { videoScaleForRotation } from "./geometry";
import styles from "./styles.module.css";

export interface NoteMarker {
  fileIndex?: number;
  id: string;
  timeSec: number;
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
  useHotkey(bindingKeys(shortcuts, "viewer.seek-back"), () => seekBy(-5), {
    enabled: active,
    ignoreInputs: true,
  });
  useHotkey(bindingKeys(shortcuts, "viewer.seek-forward"), () => seekBy(5), {
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
  return (
    <Video.Media
      className={styles.media}
      src={src}
      preload="metadata"
      onError={onError}
      onLoadedMetadata={onLoadedMetadata}
      style={{
        objectFit: stretch ? "fill" : "contain",
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
  noteMarkers,
  active,
  width,
  height,
  onRatio,
  onError,
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
        onError={onError}
        onLoadedMetadata={onLoadedMetadata}
      />
      <EndPoster src={poster} />
      {active ? (
        <ChromePortal slot="bottom">
          <ViewerHud.Tools
            tooltipSide="top"
            className={styles.transport}
            role="toolbar"
            aria-label="Playback"
          >
            <Video.Controls className={styles.controls}>
              <Video.Row className={styles.row}>
                <Video.PlayButton />
                <FrameControls frameRate={frameRate} />
                <Video.Volume />
                <Video.TimeDisplay />
                <div className={styles.timeline}>
                  <Video.Scrubber />
                  {noteMarkers && noteMarkers.length > 0 ? (
                    <NoteMarkers
                      markers={noteMarkers.filter(
                        (note) => (note.fileIndex ?? 0) === fileIndex,
                      )}
                    />
                  ) : null}
                </div>
                {save ? (
                  <ViewerHud.Tool
                    label="Notes"
                    onClick={() => setNotesOpen(true)}
                  >
                    <IconNotepadFill18 />
                  </ViewerHud.Tool>
                ) : null}
                <Video.SpeedSelect />
                <ViewerHud.Tool
                  label="Rotate Video"
                  onClick={() => setRotation((value) => (value + 90) % 360)}
                >
                  <IconRotateImageClockwiseFill18 />
                </ViewerHud.Tool>
                <ViewerHud.Tool
                  label="Mirror Video"
                  pressed={mirrored}
                  onClick={() => setMirrored((value) => !value)}
                >
                  <IconFlipHorizontal2Fill18 />
                </ViewerHud.Tool>
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
                  <IconAnimationRepeatFill18 />
                </ViewerHud.Tool>
                <Video.FullscreenButton />
              </Video.Row>
            </Video.Controls>
          </ViewerHud.Tools>
        </ChromePortal>
      ) : null}
      {notesOpen && save ? (
        <Dialog.Root open onOpenChange={setNotesOpen}>
          <Dialog.Portal>
            <Dialog.Backdrop />
            <Dialog.Popup>
              <Dialog.Header>
                <Dialog.Title>Video Notes</Dialog.Title>
                <Dialog.Close />
              </Dialog.Header>
              <div className={styles.notes}>
                <LoopControls
                  key={src}
                  range={loopRange}
                  onChange={changeLoop}
                />
                <VideoNotesSection save={save} fileIndex={fileIndex} />
              </div>
            </Dialog.Popup>
          </Dialog.Portal>
        </Dialog.Root>
      ) : null}
    </Video.Root>
  );
}

function FrameControls({ frameRate }: { frameRate: number | null }) {
  const { actions } = useVideo();
  return (
    <>
      <ViewerHud.Tool
        label="Previous Frame"
        disabled={!frameRate}
        onClick={() => actions.stepFrame(-1)}
      >
        <IconMediaFastBackwardsFill18 />
      </ViewerHud.Tool>
      <ViewerHud.Tool
        label="Next Frame"
        disabled={!frameRate}
        onClick={() => actions.stepFrame(1)}
      >
        <IconMediaFastForwardFill18 />
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
