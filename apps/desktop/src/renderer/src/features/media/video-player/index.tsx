import "@videojs/react/video/skin.css";

import {
  IconFullScreenOutline18 as Maximize,
  IconMediaPauseOutline18 as Pause,
  IconWindowBottomRightOutline18 as PictureInPicture2,
  IconMediaPlayOutline18 as Play,
  IconMediaPreviousOutline18 as SkipBack,
  IconMediaNextOutline18 as SkipForward,
} from "@pond/icons/outline/18";
import { ContextMenu } from "@pond/ui";
import {
  Controls,
  createPlayer,
  FullscreenButton,
  Hotkey,
  PiPButton,
  PlayButton,
  SeekButton,
  Slider,
  Time,
  TimeSlider,
  useHotkey,
  usePlayer,
} from "@videojs/react";
import { Video, videoFeatures } from "@videojs/react/video";
import { useCallback, useEffect, useMemo, useRef } from "react";
import type { Save } from "@/core/data/types";
import { VideoContextMenu } from "@/features/media/menus/video-context";
import { VideoSpeedSelect } from "@/features/media/video-speed";
import { VolumeControl } from "@/features/media/video-volume";
import { type ChapterCue, chaptersToVttUrl } from "./chapters-vtt";
import { ScrubPreview } from "./scrub-preview";
import { SPEED_OPTIONS } from "./speed-options";
import styles from "./styles.module.css";

const Player = createPlayer({ features: videoFeatures });

// The store's state is exposed as `UnknownState`; we know which features we
// configured, so narrow at the selector boundary.
type Availability = "available" | "unavailable" | "unsupported";
type PlayerStateSlice = {
  playbackRate: number;
  setPlaybackRate: (rate: number) => void;
  muted: boolean;
  volume: number;
  volumeAvailability: Availability;
  pip: boolean;
  pipAvailability: Availability;
  requestPictureInPicture: () => Promise<void>;
  togglePictureInPicture: () => Promise<void>;
  fullscreenAvailability: Availability;
};
const select =
  <K extends keyof PlayerStateSlice>(key: K) =>
  (s: unknown) =>
    (s as PlayerStateSlice)[key];

const SEEK_BUTTON_STEP = 10;
const SEEK_HOTKEY_STEP = 5;
const VOLUME_HOTKEY_STEP = 0.1;
const FRAME_STEP_SECONDS = 1 / 30;

interface VideoPlayerProps {
  src: string;
  poster?: string;
  save: Save;
  videoRef?: React.MutableRefObject<HTMLVideoElement | null>;
  chapters?: readonly ChapterCue[];
  onError?: () => void;
}

export function VideoPlayer({
  src,
  poster,
  save,
  videoRef,
  chapters,
  onError,
}: VideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const internalVideoRef = useRef<HTMLVideoElement | null>(null);

  const setVideoRef = useCallback(
    (el: HTMLVideoElement | null) => {
      internalVideoRef.current = el;
      if (videoRef) videoRef.current = el;
    },
    [videoRef],
  );

  const chaptersVttUrl = useMemo(
    () => (chapters && chapters.length > 0 ? chaptersToVttUrl(chapters) : null),
    [chapters],
  );

  useEffect(() => {
    if (!chaptersVttUrl) return;
    return () => URL.revokeObjectURL(chaptersVttUrl);
  }, [chaptersVttUrl]);

  const handleError = useCallback(() => {
    onError?.();
  }, [onError]);

  return (
    <Player.Provider>
      <ContextMenu.Root>
        <ContextMenu.Trigger
          render={
            <Player.Container ref={containerRef} className={styles.root}>
              <Video
                src={src}
                poster={poster}
                autoPlay
                playsInline
                ref={setVideoRef}
                className={styles.video}
                onError={handleError}
              >
                {chaptersVttUrl ? (
                  <track
                    src={chaptersVttUrl}
                    kind="chapters"
                    srcLang="en"
                    label="Chapters"
                    default
                  />
                ) : null}
              </Video>

              <PlayerHotkeys videoRef={internalVideoRef} />

              <PlayerControls src={src} />
            </Player.Container>
          }
        />
        <VideoContextMenu save={save} containerRef={containerRef} />
      </ContextMenu.Root>
    </Player.Provider>
  );
}

function PlayerHotkeys({
  videoRef,
}: {
  videoRef: React.RefObject<HTMLVideoElement | null>;
}) {
  const setPlaybackRate = usePlayer(select("setPlaybackRate"));
  const playbackRateRef = useRef(0);
  playbackRateRef.current = usePlayer(select("playbackRate"));

  const stepSpeed = useCallback(
    (delta: 1 | -1) => {
      const current = playbackRateRef.current;
      const idx = SPEED_OPTIONS.indexOf(
        current as (typeof SPEED_OPTIONS)[number],
      );
      const base = idx < 0 ? SPEED_OPTIONS.indexOf(1) : idx;
      const next = Math.min(
        SPEED_OPTIONS.length - 1,
        Math.max(0, base + delta),
      );
      const target = SPEED_OPTIONS[next];
      if (target !== undefined) setPlaybackRate(target);
    },
    [setPlaybackRate],
  );

  useHotkey({
    keys: ">",
    onActivate: () => stepSpeed(1),
  });

  useHotkey({
    keys: "<",
    onActivate: () => stepSpeed(-1),
  });

  const stepFrame = useCallback(
    (delta: 1 | -1) => {
      const video = videoRef.current;
      if (!video) return;
      if (!video.paused) video.pause();
      video.currentTime = Math.max(
        0,
        video.currentTime + delta * FRAME_STEP_SECONDS,
      );
    },
    [videoRef],
  );

  useHotkey({
    keys: ".",
    onActivate: () => stepFrame(1),
  });

  useHotkey({
    keys: ",",
    onActivate: () => stepFrame(-1),
  });

  return (
    <>
      <Hotkey keys="k" action="togglePaused" />
      <Hotkey keys="Space" action="togglePaused" />
      <Hotkey keys="m" action="toggleMuted" />
      <Hotkey keys="f" action="toggleFullscreen" />
      <Hotkey keys="p" action="togglePictureInPicture" />
      <Hotkey keys="ArrowLeft" action="seekStep" value={-SEEK_HOTKEY_STEP} />
      <Hotkey keys="ArrowRight" action="seekStep" value={SEEK_HOTKEY_STEP} />
      <Hotkey keys="ArrowUp" action="volumeStep" value={VOLUME_HOTKEY_STEP} />
      <Hotkey
        keys="ArrowDown"
        action="volumeStep"
        value={-VOLUME_HOTKEY_STEP}
      />
      <Hotkey keys="0-9" action="seekToPercent" />
    </>
  );
}

function PlayerControls({ src }: { src: string }) {
  const playbackRate = usePlayer(select("playbackRate"));
  const setPlaybackRate = usePlayer(select("setPlaybackRate"));
  const pipAvailable = usePlayer(select("pipAvailability")) === "available";
  const volumeUnsupported =
    usePlayer(select("volumeAvailability")) === "unsupported";
  const fullscreenAvailable =
    usePlayer(select("fullscreenAvailability")) === "available";
  const seekSliderRef = useRef<HTMLDivElement | null>(null);

  return (
    <Controls.Root className={styles.controls}>
      <Controls.Group
        className={styles["controls-group"]}
        aria-label="Playback controls"
      >
        <PlayButton
          className={styles.btn}
          render={(props, state) => (
            <button
              {...props}
              type="button"
              aria-label={
                state.paused
                  ? "Play (keyboard shortcut k)"
                  : "Pause (keyboard shortcut k)"
              }
            >
              {state.paused ? (
                <Play width={14} height={14} />
              ) : (
                <Pause width={14} height={14} />
              )}
            </button>
          )}
        />

        <SeekButton
          seconds={-SEEK_BUTTON_STEP}
          className={styles.btn}
          render={(props) => (
            <button
              {...props}
              type="button"
              aria-label={`Seek back ${SEEK_BUTTON_STEP} seconds`}
            >
              <SkipBack width={14} height={14} />
            </button>
          )}
        />

        <SeekButton
          seconds={SEEK_BUTTON_STEP}
          className={styles.btn}
          render={(props) => (
            <button
              {...props}
              type="button"
              aria-label={`Seek forward ${SEEK_BUTTON_STEP} seconds`}
            >
              <SkipForward width={14} height={14} />
            </button>
          )}
        />

        <VolumeControl unsupported={volumeUnsupported} />

        <Time.Value type="current" className={styles.time} />

        <TimeSlider.Root ref={seekSliderRef} className={styles["seek-slider"]}>
          <TimeSlider.Track className={styles["slider-track"]}>
            <TimeSlider.Buffer className={styles["slider-buffer"]} />
            <TimeSlider.Fill className={styles["slider-fill"]} />
          </TimeSlider.Track>
          <TimeSlider.Thumb className={styles["slider-thumb"]} />
          <Slider.Preview className={styles["slider-preview"]}>
            <ScrubPreview src={src} sliderRef={seekSliderRef} />
            <TimeSlider.Value
              type="pointer"
              className={styles["slider-preview-time"]}
            />
          </Slider.Preview>
        </TimeSlider.Root>

        <Time.Value type="duration" className={styles.time} />

        <VideoSpeedSelect
          value={playbackRate}
          onValueChange={setPlaybackRate}
          className={styles["speed-select"]}
        />

        {pipAvailable ? (
          <PiPButton
            className={styles.btn}
            render={(props) => (
              <button
                {...props}
                type="button"
                aria-label="Picture-in-Picture (keyboard shortcut p)"
              >
                <PictureInPicture2 width={14} height={14} />
              </button>
            )}
          />
        ) : null}

        {fullscreenAvailable ? (
          <FullscreenButton
            className={styles.btn}
            render={(props) => (
              <button
                {...props}
                type="button"
                aria-label="Full window (keyboard shortcut f)"
              >
                <Maximize width={14} height={14} />
              </button>
            )}
          />
        ) : null}
      </Controls.Group>
    </Controls.Root>
  );
}
