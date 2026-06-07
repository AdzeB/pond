import { Menu, Select } from "@pond/ui";
import type { LayoutValue } from "@/lib/utils/view-prefs";
import { useView } from "../../context";

const options: Array<{
  value: LayoutValue;
  label: string;
}> = [
  { value: "waterfall", label: "Waterfall" },
  { value: "grid", label: "Grid" },
  { value: "justified", label: "Justified" },
  { value: "list", label: "List" },
];

export function LayoutSection() {
  const { state, actions } = useView();

  return (
    <Menu.Group>
      <Menu.Item stale>
        Layout
        <Select.Root
          value={state.layout}
          onValueChange={(value) => actions.setLayout(value as LayoutValue)}
        >
          <Select.Trigger style={{ marginLeft: "auto" }}>
            <Select.Value>
              {(value: LayoutValue) => (
                <span style={{ textTransform: "capitalize" }}>{value}</span>
              )}
            </Select.Value>
          </Select.Trigger>
          <Select.Portal>
            <Select.Positioner>
              <Select.Popup>
                <Select.List>
                  {options.map(({ label, value }) => (
                    <Select.Item key={label} value={value}>
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
