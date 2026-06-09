import { Menu } from "@pond/ui";
import { useStore } from "@tanstack/react-store";
import React from "react";
import {
  primarySelection,
  primarySelectionStore,
  selection,
} from "@/core/data/selection";
import { useView } from "@/features/library/hooks/use-view";
import type { DisplayPrefKey } from "@/features/library/stores/display-prefs";
import { useSidebar } from "@/features/library/stores/shell-state";

const TOGGLES: Array<{ key: DisplayPrefKey; label: string }> = [
  { key: "name", label: "Show name" },
  { key: "date", label: "Show date" },
  { key: "fileCount", label: "Show file count" },
];

export function DisplaySection() {
  const { state, actions } = useView();

  const { open: sidebarOpen, setOpen: setSidebarOpen } = useSidebar();

  const drawerOpen = useStore(primarySelectionStore, (s) => s.id != null);
  const setDrawerOpen = (open: boolean) => {
    if (open) {
      const anchor = selection.getAnchor();
      if (anchor) primarySelection.set(anchor);
    } else {
      primarySelection.set(null);
    }
  };

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
          checked={drawerOpen}
          onCheckedChange={(v) => setDrawerOpen(Boolean(v))}
        >
          <Menu.ItemLabel>Show details</Menu.ItemLabel>
          <Menu.SwitchItemIndicator />
        </Menu.CheckboxItem>
      </Menu.Group>
    </React.Fragment>
  );
}
