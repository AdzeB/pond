import {
  IconVolumeOutline18 as Volume2,
  IconVolumeOffOutline18 as VolumeX,
} from "@pond/icons/outline/18";
import { MuteButton, Popover, usePlayer, VolumeSlider } from "@videojs/react";
import styles from "@/components/media/video-player/styles.module.css";

type VolumeSlice = { muted: boolean; volume: number };
const select =
  <K extends keyof VolumeSlice>(key: K) =>
  (s: unknown) =>
    (s as VolumeSlice)[key];

export function VolumeControl({ unsupported }: { unsupported: boolean }) {
  const muted = usePlayer(select("muted"));
  const volume = usePlayer(select("volume"));

  const trigger = (
    <MuteButton
      className={styles.btn}
      render={(props, state) => {
        const isMuted = unsupported || state.muted || volume === 0;
        return (
          <button
            {...props}
            type="button"
            disabled={unsupported || undefined}
            aria-label={
              isMuted
                ? "Unmute (keyboard shortcut m)"
                : "Mute (keyboard shortcut m)"
            }
          >
            {muted || volume === 0 ? (
              <VolumeX width={14} height={14} />
            ) : (
              <Volume2 width={14} height={14} />
            )}
          </button>
        );
      }}
    />
  );

  if (unsupported) return trigger;

  return (
    <Popover.Root openOnHover delay={200} closeDelay={120} side="top">
      <Popover.Trigger render={trigger} />
      <Popover.Popup className={styles["volume-popup"]}>
        <VolumeSlider.Root
          orientation="vertical"
          className={styles["volume-slider"]}
        >
          <VolumeSlider.Track className={styles["slider-track"]}>
            <VolumeSlider.Fill className={styles["slider-fill"]} />
          </VolumeSlider.Track>
          <VolumeSlider.Thumb className={styles["slider-thumb"]} />
        </VolumeSlider.Root>
      </Popover.Popup>
    </Popover.Root>
  );
}
