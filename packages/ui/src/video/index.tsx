import { Select as SelectBase } from "@base-ui/react/select";
import { Slider as SliderBase } from "@base-ui/react/slider";
import {
  IconFullScreenFill18 as FullscreenIcon,
  IconMediaPauseFill18 as PauseIcon,
  IconWindowBottomRightFill18 as PipIcon,
  IconMediaPlayFill18 as PlayIcon,
  IconVolumeFill18 as VolumeIcon,
  IconVolumeOffFill18 as VolumeOffIcon,
} from "@pond/icons/fill/18";
import { useMemo } from "react";
import { cn } from "../_shared/cn";
import {
  useVideo,
  type VideoActions,
  VideoContext,
  type VideoContextValue,
} from "./context";
import { formatTime, SPEED_OPTIONS } from "./lib";
import styles from "./styles.module.css";
import { useAutoHide } from "./use-auto-hide";
import { useVideoHotkeys } from "./use-hotkeys";
import { useMediaState } from "./use-media-state";
import { usePip } from "./use-pip";

const ICON = 16;

interface RootProps extends React.ComponentPropsWithoutRef<"div"> {}

function Root({ className, children, ...props }: RootProps) {
  const {
    state,
    actions: mediaActions,
    videoRef,
    rootRef,
    registerVideo,
  } = useMediaState();
  const { controlsVisible, showControls } = useAutoHide({
    rootRef,
    videoRef,
    playing: state.playing,
  });
  const { pipSupported, pipActive, requestPip } = usePip({ videoRef });

  const actions = useMemo<VideoActions>(
    () => ({ ...mediaActions, requestPip, showControls }),
    [mediaActions, requestPip, showControls],
  );

  useVideoHotkeys({ rootRef, videoRef, actions });

  const value = useMemo<VideoContextValue>(
    () => ({
      state: { ...state, controlsVisible, pipSupported, pipActive },
      actions,
      meta: { videoRef, rootRef, registerVideo },
    }),
    [
      state,
      controlsVisible,
      pipSupported,
      pipActive,
      actions,
      videoRef,
      rootRef,
      registerVideo,
    ],
  );

  return (
    <VideoContext value={value}>
      <div
        ref={rootRef}
        className={cn(styles.root, className)}
        // biome-ignore lint/a11y/noNoninteractiveTabindex: the player is a focus target so keyboard shortcuts work.
        tabIndex={0}
        {...props}
      >
        {children}
      </div>
    </VideoContext>
  );
}

interface MediaProps extends React.ComponentPropsWithoutRef<"video"> {}

function Media({ className, children, ...props }: MediaProps) {
  const { meta } = useVideo();
  return (
    <video
      ref={meta.registerVideo}
      className={cn(styles.video, className)}
      playsInline
      {...props}
    >
      {children}
    </video>
  );
}

interface ControlsProps extends React.ComponentPropsWithoutRef<"div"> {}

function Controls({ className, children, ...props }: ControlsProps) {
  const { state } = useVideo();
  return (
    <div
      className={cn(styles.controls, className)}
      data-visible={state.controlsVisible ? "" : undefined}
      {...props}
    >
      <div className={styles.bar}>{children}</div>
    </div>
  );
}

type ButtonProps = Omit<React.ComponentPropsWithoutRef<"button">, "type">;

function PlayButton({ className, ...props }: ButtonProps) {
  const { state, actions } = useVideo();
  return (
    <button
      type="button"
      className={cn(styles.button, className)}
      onClick={actions.togglePlay}
      aria-label={state.playing ? "Pause" : "Play"}
      {...props}
    >
      {state.playing ? (
        <PauseIcon width={ICON} height={ICON} />
      ) : (
        <PlayIcon width={ICON} height={ICON} />
      )}
    </button>
  );
}

function MuteButton({ className, ...props }: ButtonProps) {
  const { state, actions } = useVideo();
  const muted = state.muted || state.volume === 0;
  return (
    <button
      type="button"
      className={cn(styles.button, className)}
      onClick={actions.toggleMute}
      aria-label={muted ? "Unmute" : "Mute"}
      {...props}
    >
      {muted ? (
        <VolumeOffIcon width={ICON} height={ICON} />
      ) : (
        <VolumeIcon width={ICON} height={ICON} />
      )}
    </button>
  );
}

function Volume({ className }: { className?: string }) {
  const { state, actions } = useVideo();
  const level = state.muted ? 0 : state.volume;
  return (
    <div className={cn(styles.volume, className)}>
      <MuteButton />
      <div className={styles.volumePopup}>
        <SliderBase.Root
          orientation="vertical"
          min={0}
          max={1}
          step={0.05}
          value={level}
          onValueChange={(v) =>
            actions.setVolume(typeof v === "number" ? v : (v[0] ?? 0))
          }
          aria-label="Volume"
          className={styles.volumeSlider}
        >
          <SliderBase.Control className={styles.volumeControl}>
            <SliderBase.Track className={styles.volumeTrack}>
              <SliderBase.Indicator className={styles.volumeIndicator} />
              <SliderBase.Thumb className={styles.volumeThumb} />
            </SliderBase.Track>
          </SliderBase.Control>
        </SliderBase.Root>
      </div>
    </div>
  );
}

function CurrentTime({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"span">) {
  const { state } = useVideo();
  return (
    <span className={cn(styles.time, className)} {...props}>
      {formatTime(state.currentTime)}
    </span>
  );
}

function Duration({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"span">) {
  const { state } = useVideo();
  return (
    <span className={cn(styles.time, className)} {...props}>
      {formatTime(state.duration)}
    </span>
  );
}

function Scrubber({ className }: { className?: string }) {
  const { state, actions } = useVideo();
  const max = state.duration > 0 ? state.duration : 1;
  const current = Math.min(state.currentTime, max);
  return (
    <SliderBase.Root
      className={cn(styles.scrubber, className)}
      value={current}
      min={0}
      max={max}
      step={0.1}
      onValueChange={(v) =>
        actions.seek(typeof v === "number" ? v : (v[0] ?? 0))
      }
      aria-label="Seek"
    >
      <SliderBase.Control className={styles.scrubberControl}>
        <SliderBase.Track className={styles.track}>
          <div
            className={styles.buffer}
            style={{ width: `${(state.buffered / max) * 100}%` }}
          />
          <SliderBase.Indicator className={styles.indicator} />
          <SliderBase.Thumb className={styles.thumb} />
        </SliderBase.Track>
      </SliderBase.Control>
    </SliderBase.Root>
  );
}

interface SpeedSelectProps {
  className?: string;
  options?: readonly number[];
}

function SpeedSelect({ className, options = SPEED_OPTIONS }: SpeedSelectProps) {
  const { state, actions } = useVideo();
  return (
    <SelectBase.Root
      value={state.rate}
      onValueChange={(value) => {
        if (value !== null) actions.setRate(value);
      }}
    >
      <SelectBase.Trigger
        className={cn(styles.speed, className)}
        aria-label="Playback speed"
      >
        <SelectBase.Value>{(value) => `${value ?? 1}×`}</SelectBase.Value>
      </SelectBase.Trigger>
      <SelectBase.Portal>
        <SelectBase.Positioner
          side="top"
          align="center"
          sideOffset={8}
          className={styles.speedPositioner}
        >
          <SelectBase.Popup className={styles.speedPopup}>
            {options.map((rate) => (
              <SelectBase.Item
                key={rate}
                value={rate}
                className={styles.speedItem}
              >
                <SelectBase.ItemText>{rate}×</SelectBase.ItemText>
              </SelectBase.Item>
            ))}
          </SelectBase.Popup>
        </SelectBase.Positioner>
      </SelectBase.Portal>
    </SelectBase.Root>
  );
}

function PiPButton({ className, ...props }: ButtonProps) {
  const { state, actions } = useVideo();
  if (!state.pipSupported) return null;
  return (
    <button
      type="button"
      className={cn(styles.button, className)}
      onClick={actions.requestPip}
      aria-label={state.pipActive ? "Exit pop-out" : "Pop out"}
      aria-pressed={state.pipActive}
      {...props}
    >
      <PipIcon width={ICON} height={ICON} />
    </button>
  );
}

function FullscreenButton({ className, ...props }: ButtonProps) {
  const { state, actions } = useVideo();
  if (!state.fullscreenSupported) return null;
  return (
    <button
      type="button"
      className={cn(styles.button, className)}
      onClick={actions.toggleFullscreen}
      aria-label={state.fullscreen ? "Exit full screen" : "Full screen"}
      {...props}
    >
      <FullscreenIcon width={ICON} height={ICON} />
    </button>
  );
}

function Spacer() {
  return <div className={styles.spacer} />;
}

export const Video = {
  Root,
  Media,
  Controls,
  PlayButton,
  MuteButton,
  Volume,
  CurrentTime,
  Duration,
  Scrubber,
  SpeedSelect,
  PiPButton,
  FullscreenButton,
  Spacer,
};
