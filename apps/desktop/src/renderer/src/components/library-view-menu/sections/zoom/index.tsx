import { IconMagnifierFill18 as ZoomIcon } from "@pond/icons/fill/18";
import { Menu } from "@pond/ui";
import { useView } from "@/hooks/use-view";
import { ZOOM_DEFAULT, ZOOM_MAX, ZOOM_MIN } from "@/lib/zoom";
import { ViewSubmenu } from "../../submenu";

const options: Array<{ value: number; label: string }> = [
  { value: ZOOM_MIN, label: "Compact" },
  { value: 105, label: "Cozy" },
  { value: ZOOM_DEFAULT, label: "Comfortable" },
  { value: 185, label: "Spacious" },
  { value: ZOOM_MAX, label: "Roomy" },
];

function closest(value: number): number {
  let best = options[0]?.value ?? ZOOM_DEFAULT;
  let bestDelta = Math.abs(value - best);
  for (const { value: option } of options) {
    const delta = Math.abs(value - option);
    if (delta < bestDelta) {
      best = option;
      bestDelta = delta;
    }
  }
  return best;
}

export function ZoomSection({ standalone }: { standalone?: boolean }) {
  const { state, actions } = useView();
  const value = closest(state.zoom);

  return (
    <ViewSubmenu icon={<ZoomIcon />} label="Zoom" standalone={standalone}>
      <Menu.Group>
        {options.map(({ value: option, label }) => (
          <Menu.CheckboxItem
            key={label}
            closeOnClick={false}
            checked={value === option}
            onCheckedChange={(checked) => {
              if (checked) actions.setZoom(option);
            }}
          >
            <Menu.CheckboxItemIndicator />
            <Menu.ItemLabel>{label}</Menu.ItemLabel>
          </Menu.CheckboxItem>
        ))}
      </Menu.Group>
    </ViewSubmenu>
  );
}
