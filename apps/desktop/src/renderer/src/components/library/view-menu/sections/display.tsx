import { Menu } from "@pond/ui";
import { Check, ChevronRight, SlidersHorizontal } from "lucide-react";
import type { DisplayPrefKey } from "@/lib/display-prefs";
import { useInspector, useSidebar } from "@/lib/shell-state";
import { useView } from "../context";
import sectionStyles from "./section.module.css";

const TOGGLES: Array<{ key: DisplayPrefKey; label: string }> = [
  { key: "name", label: "Show name" },
  { key: "date", label: "Show date" },
  { key: "fileCount", label: "Show file count" },
];

export function Display() {
  const { state, actions } = useView();
  const { open: sidebarOpen, setOpen: setSidebarOpen } = useSidebar();
  const { open: inspectorOpen, setOpen: setInspectorOpen } = useInspector();

  return (
    <Menu.SubmenuRoot>
      <Menu.SubmenuTrigger>
        <Menu.ItemIcon>
          <SlidersHorizontal width="14" height="14" />
        </Menu.ItemIcon>
        <Menu.ItemLabel>Display</Menu.ItemLabel>
        <span className={sectionStyles.chevron} aria-hidden>
          <ChevronRight width="12" height="12" />
        </span>
      </Menu.SubmenuTrigger>
      <Menu.Portal>
        <Menu.Positioner side="left" align="start" sideOffset={4}>
          <Menu.Popup>
            {TOGGLES.map(({ key, label }) => (
              <Menu.CheckboxItem
                key={key}
                closeOnClick={false}
                checked={state.displayPrefs[key]}
                onCheckedChange={(v) => actions.setDisplayPref(key, Boolean(v))}
              >
                <Indicator on={state.displayPrefs[key]} />
                <Menu.ItemLabel>{label}</Menu.ItemLabel>
              </Menu.CheckboxItem>
            ))}
            <Menu.Separator />
            <Menu.CheckboxItem
              closeOnClick={false}
              checked={sidebarOpen}
              onCheckedChange={(v) => setSidebarOpen(Boolean(v))}
            >
              <Indicator on={sidebarOpen} />
              <Menu.ItemLabel>Show sidebar</Menu.ItemLabel>
            </Menu.CheckboxItem>
            <Menu.CheckboxItem
              closeOnClick={false}
              checked={inspectorOpen}
              onCheckedChange={(v) => setInspectorOpen(Boolean(v))}
            >
              <Indicator on={inspectorOpen} />
              <Menu.ItemLabel>Show inspector</Menu.ItemLabel>
            </Menu.CheckboxItem>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.SubmenuRoot>
  );
}

function Indicator({ on }: { on: boolean }) {
  return (
    <span className={sectionStyles["check-cell"]} aria-hidden>
      {on ? <Check width="0.85em" height="0.85em" /> : null}
    </span>
  );
}
