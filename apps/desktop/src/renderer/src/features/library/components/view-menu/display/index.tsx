import { Switch } from "@pond/ui";
import { useId } from "react";
import { useView } from "@/features/library/hooks/use-view";
import type { DisplayPrefKey } from "@/features/saves/state/display-prefs";
import {
  LIST_COLUMN_OPTIONS,
  setListColumn,
  useListColumns,
} from "@/features/saves/state/list-columns";
import styles from "./styles.module.css";

const TOGGLES: Array<{ key: DisplayPrefKey; label: string }> = [
  { key: "name", label: "Show Name" },
  { key: "date", label: "Show Date" },
  { key: "source", label: "Show Source" },
  { key: "type", label: "Show Format" },
  { key: "fileCount", label: "Show File Count" },
];

export function DisplaySection() {
  const { state, actions } = useView();
  const listColumns = useListColumns();
  const id = useId();
  const list = state.layout === "list";

  return (
    <div className={styles.rows}>
      {list
        ? LIST_COLUMN_OPTIONS.map(({ key, label }) => (
            <label key={key} htmlFor={`${id}-${key}`} className={styles.row}>
              <span className={styles.label}>Show {label}</span>
              <Switch.Root
                id={`${id}-${key}`}
                checked={listColumns[key]}
                onCheckedChange={(checked) => setListColumn(key, checked)}
              />
            </label>
          ))
        : TOGGLES.map(({ key, label }) => (
            <label key={key} htmlFor={`${id}-${key}`} className={styles.row}>
              <span className={styles.label}>{label}</span>
              <Switch.Root
                id={`${id}-${key}`}
                checked={state.displayPrefs[key]}
                onCheckedChange={(checked) =>
                  actions.setDisplayPref(key, checked)
                }
              />
            </label>
          ))}
    </div>
  );
}
