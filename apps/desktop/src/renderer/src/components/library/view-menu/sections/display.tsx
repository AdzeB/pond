import { Menu } from "@pond/ui";
import { Check } from "lucide-react";
import type { DisplayPrefKey } from "@/lib/display-prefs";
import { useInspector, useSidebar } from "@/lib/shell-state";
import { useView } from "../context";
import styles from "./display.module.css";

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
    <Menu.Group>
      <Menu.GroupLabel>Display</Menu.GroupLabel>
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
    </Menu.Group>
  );
}

function Indicator({ on }: { on: boolean }) {
  return (
    <span className={styles["check-cell"]} aria-hidden>
      {on ? <Check width="0.85em" height="0.85em" /> : null}
    </span>
  );
}
