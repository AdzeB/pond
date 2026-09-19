import { IconMinusFill18, IconPlusFill18 } from "@pond/icons/fill/18";
import { ViewerHud } from "@/features/saves/components/viewers/hud";

export function ZoomPill({
  actual,
  onOut,
  onIn,
}: {
  actual: number;
  onOut: () => void;
  onIn: () => void;
}) {
  return (
    <ViewerHud.Tools tooltipSide="bottom" role="group" aria-label="Zoom">
      <ViewerHud.Tool label="Zoom Out" onClick={onOut}>
        <IconMinusFill18 />
      </ViewerHud.Tool>
      <ViewerHud.Scale>{Math.round(actual * 100)}%</ViewerHud.Scale>
      <ViewerHud.Tool label="Zoom In" onClick={onIn}>
        <IconPlusFill18 />
      </ViewerHud.Tool>
    </ViewerHud.Tools>
  );
}
