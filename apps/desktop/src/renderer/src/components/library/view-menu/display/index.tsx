import { Switch } from "@pond/ui";
import { useId } from "react";
import { useView } from "@/hooks/use-view";
import type { DisplayPrefKey } from "@/stores/display-prefs";
import styles from "./styles.module.css";

const TOGGLES: Array<{ key: DisplayPrefKey; label: string }> = [
  { key: "name", label: "Show Name" },
  { key: "date", label: "Show Date" },
  { key: "source", label: "Show Source" },
  { key: "type", label: "Show Format" },
  { key: "fileCount", label: "Show File Count" },
  { key: "notes", label: "Show Notes" },
];

export function DisplaySection() {
  const { state, actions } = useView();
  const id = useId();

  return (
    <div className={styles.rows}>
      {TOGGLES.map(({ key, label }) => (
        <label key={key} htmlFor={`${id}-${key}`} className={styles.row}>
          <span className={styles.label}>{label}</span>
          <Switch.Root
            id={`${id}-${key}`}
            checked={state.displayPrefs[key]}
            onCheckedChange={(checked) => actions.setDisplayPref(key, checked)}
          />
        </label>
      ))}
    </div>
  );
}
