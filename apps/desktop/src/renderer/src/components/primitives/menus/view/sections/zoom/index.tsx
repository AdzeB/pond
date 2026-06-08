import { Menu, Select } from "@pond/ui";
import { useView } from "@/lib/hooks/use-view";
import { ZOOM_DEFAULT, ZOOM_MAX, ZOOM_MIN } from "@/lib/utils/zoom";

const options: Array<{
  value: number;
  label: string;
}> = [
  { value: ZOOM_MIN, label: "Smaller" },
  { value: 105, label: "Small" },
  { value: ZOOM_DEFAULT, label: "Default" },
  { value: 185, label: "Large" },
  { value: ZOOM_MAX, label: "Larger" },
];

function closest(value: number): number {
  let best = options[0]?.value;
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

export function ZoomSection() {
  const { state, actions } = useView();

  const value = closest(state.zoom);

  return (
    <Menu.Group>
      <Menu.Item stale>
        Zoom
        <Select.Root
          value={value}
          onValueChange={(next) => actions.setZoom(next as number)}
        >
          <Select.Trigger style={{ marginLeft: "auto" }}>
            <Select.Value>
              {(current: number) => (
                <span>
                  {options.find((option) => option.value === current)?.label}
                </span>
              )}
            </Select.Value>
          </Select.Trigger>
          <Select.Portal>
            <Select.Positioner>
              <Select.Popup>
                <Select.List>
                  {options.map(({ label, value: option }) => (
                    <Select.Item key={label} value={option}>
                      <Select.ItemText>{label}</Select.ItemText>
                      <Select.ItemIndicator />
                    </Select.Item>
                  ))}
                </Select.List>
              </Select.Popup>
            </Select.Positioner>
          </Select.Portal>
        </Select.Root>
      </Menu.Item>
    </Menu.Group>
  );
}
