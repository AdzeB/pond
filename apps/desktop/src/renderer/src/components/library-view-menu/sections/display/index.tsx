import { IconEyeFill18 as DisplayIcon } from "@pond/icons/fill/18";
import { Menu } from "@pond/ui";
import { useView } from "@/hooks/use-view";
import type { DisplayPrefKey } from "@/stores/display-prefs";
import { ViewSubmenu } from "../../submenu";

const TOGGLES: Array<{ key: DisplayPrefKey; label: string }> = [
  { key: "name", label: "Name" },
  { key: "date", label: "Date" },
  { key: "source", label: "Source" },
  { key: "type", label: "Type" },
  { key: "fileCount", label: "File count" },
];

export function DisplaySection({ standalone }: { standalone?: boolean }) {
  const { state, actions } = useView();

  return (
    <ViewSubmenu icon={<DisplayIcon />} label="Display" standalone={standalone}>
      <Menu.Group>
        {TOGGLES.map(({ key, label }) => (
          <Menu.CheckboxItem
            key={key}
            closeOnClick={false}
            checked={state.displayPrefs[key]}
            onCheckedChange={(v) => actions.setDisplayPref(key, Boolean(v))}
          >
            <Menu.ItemLabel>{label}</Menu.ItemLabel>
            <Menu.SwitchItemIndicator />
          </Menu.CheckboxItem>
        ))}
      </Menu.Group>
    </ViewSubmenu>
  );
}
