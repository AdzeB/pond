import {
  IconVolumeOffOutline18,
  IconVolumeOutline18,
} from "@pond/icons/outline/18";
import { useVideo } from "@pond/ui";
import { ViewerHud } from "@/features/saves/components/viewers/hud";

export function VolumeControl() {
  const { state, actions } = useVideo();
  const muted = state.muted || state.volume === 0;
  return (
    <ViewerHud.Tool
      label={muted ? "Unmute" : "Mute"}
      onClick={actions.toggleMute}
    >
      {muted ? <IconVolumeOffOutline18 /> : <IconVolumeOutline18 />}
    </ViewerHud.Tool>
  );
}
