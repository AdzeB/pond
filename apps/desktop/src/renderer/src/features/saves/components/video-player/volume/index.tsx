import {
  IconVolumeOffOutline18,
  IconVolumeOutline18,
} from "@pond/icons/outline/18";
import { useVideo } from "@pond/ui";
import { ViewerHud } from "@/features/saves/components/viewers/hud";
import { ShortcutKeys } from "@/shared/components/shortcut-keys";
import styles from "./styles.module.css";

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

function VolumeSlider() {
  const { state, actions } = useVideo();
  return (
    <input
      type="range"
      className={styles.slider}
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

export function VolumeControl() {
  return (
    <div className={styles.control} data-video-volume-control>
      <MuteButton />
      <div className={styles.popover} data-video-volume-popover>
        <VolumeSlider />
      </div>
    </div>
  );
}
