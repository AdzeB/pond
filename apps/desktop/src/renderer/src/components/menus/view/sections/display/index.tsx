import { Menu } from "@pond/ui";
import React from "react";
import type { DisplayPrefKey } from "@/lib/stores/display-prefs";
import { useInspector, useSidebar } from "@/lib/stores/shell-state";
import { useView } from "../../context";

const TOGGLES: Array<{ key: DisplayPrefKey; label: string }> = [
  { key: "name", label: "Show name" },
  { key: "date", label: "Show date" },
  { key: "fileCount", label: "Show file count" },
];

export function DisplaySection() {
  const { state, actions } = useView();

  const { open: sidebarOpen, setOpen: setSidebarOpen } = useSidebar();

  const { open: inspectorOpen, setOpen: setInspectorOpen } = useInspector();

  return (
    <React.Fragment>
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
      <Menu.Separator />
      <Menu.Group>
        <Menu.CheckboxItem
          closeOnClick={false}
          checked={sidebarOpen}
          onCheckedChange={(v) => setSidebarOpen(Boolean(v))}
        >
          <Menu.ItemLabel>Show sidebar</Menu.ItemLabel>
          <Menu.SwitchItemIndicator />
        </Menu.CheckboxItem>
        <Menu.CheckboxItem
          closeOnClick={false}
          checked={inspectorOpen}
          onCheckedChange={(v) => setInspectorOpen(Boolean(v))}
        >
          <Menu.ItemLabel>Show inspector</Menu.ItemLabel>
          <Menu.SwitchItemIndicator />
        </Menu.CheckboxItem>
      </Menu.Group>
    </React.Fragment>
  );
}
