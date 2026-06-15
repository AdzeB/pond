import { IconGridLayoutFill18 as LayoutIcon } from "@pond/icons/fill/18";
import { Menu } from "@pond/ui";
import { useView } from "@/hooks/use-view";
import type { LayoutValue } from "@/lib/view-prefs";
import { ViewSubmenu } from "../../submenu";

const options: Array<{ value: LayoutValue; label: string }> = [
  { value: "waterfall", label: "Waterfall" },
  { value: "grid", label: "Grid" },
  { value: "justified", label: "Justified" },
  { value: "list", label: "List" },
];

export function LayoutSection({ standalone }: { standalone?: boolean }) {
  const { state, actions } = useView();

  return (
    <ViewSubmenu icon={<LayoutIcon />} label="Layout" standalone={standalone}>
      <Menu.Group>
        {options.map(({ value, label }) => (
          <Menu.CheckboxItem
            key={value}
            closeOnClick={false}
            checked={state.layout === value}
            onCheckedChange={(checked) => {
              if (checked) actions.setLayout(value);
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
