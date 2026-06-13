import { Menu } from "@pond/ui";
import { useView } from "@/hooks/use-view";
import type { DisplayPrefKey } from "@/stores/display-prefs";

const TOGGLES: Array<{ key: DisplayPrefKey; label: string }> = [
  { key: "name", label: "Show name" },
  { key: "date", label: "Show date" },
  { key: "source", label: "Show source" },
  { key: "type", label: "Show type" },
  { key: "fileCount", label: "Show file count" },
];

export function DisplaySection() {
  const { state, actions } = useView();

  return (
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
  );
}
