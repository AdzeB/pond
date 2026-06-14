import { IconEyeFill18 as DisplayIcon } from "@pond/icons/fill/18";
import { Menu } from "@pond/ui";
import { useView } from "@/hooks/use-view";
import type { DisplayPrefKey } from "@/stores/display-prefs";
import { ViewSubmenu } from "../../submenu";

const TOGGLES: Array<{ key: DisplayPrefKey; label: string }> = [
  { key: "name", label: "Show name" },
  { key: "date", label: "Show date" },
  { key: "source", label: "Show source" },
  { key: "type", label: "Show type" },
  { key: "fileCount", label: "Show file count" },
];

export function DisplaySection() {
  const { state, actions } = useView();

  const allOn = TOGGLES.every(({ key }) => state.displayPrefs[key]);

  return (
    <ViewSubmenu
      icon={<DisplayIcon />}
      label="Display"
      onReset={
        allOn
          ? undefined
          : () => {
              for (const { key } of TOGGLES) actions.setDisplayPref(key, true);
            }
      }
    >
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
