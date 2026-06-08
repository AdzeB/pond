import { SPEED_OPTIONS } from "@/components/media/video-player/speed-options";
import {
  type EnumOption,
  EnumSelect,
} from "@/components/primitives/selects/_shared/enum-select";

const OPTIONS: readonly EnumOption<number>[] = SPEED_OPTIONS.map((rate) => ({
  value: rate,
  label: `${rate}×`,
}));

interface VideoSpeedSelectProps {
  value: number;
  onValueChange: (value: number) => void;
  className?: string;
}

export function VideoSpeedSelect({
  value,
  onValueChange,
  className,
}: VideoSpeedSelectProps) {
  return (
    <EnumSelect<number>
      value={value}
      onValueChange={onValueChange}
      options={OPTIONS}
      className={className}
      align="end"
      aria-label="Change playback rate (keyboard shortcut > or <)"
    />
  );
}
