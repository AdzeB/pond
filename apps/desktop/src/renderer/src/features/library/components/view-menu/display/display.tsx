import { Switch } from "@pond/ui";
import { useId } from "react";
import { useView } from "@/features/library/hooks/use-view";
import type { DisplayPrefKey } from "@/features/library/state/display-prefs";
import {
  type ListColumnKey,
  setListColumn,
  useListColumns,
} from "@/features/library/state/list-columns";
import styles from "./display.module.css";

const TOGGLES: Array<{ key: DisplayPrefKey; label: string }> = [
  { key: "name", label: "Show Name" },
  { key: "date", label: "Show Date" },
  { key: "source", label: "Show Source" },
  { key: "type", label: "Show Format" },
  { key: "fileCount", label: "Show File Count" },
];

const LIST_TOGGLES: Array<{ key: ListColumnKey; label: string }> = [
  { key: "name", label: "Show Name" },
  { key: "tags", label: "Show Tags" },
  { key: "dimensions", label: "Show Dimensions" },
  { key: "rating", label: "Show Rating" },
  { key: "extension", label: "Show Extension" },
  { key: "fileSize", label: "Show File Size" },
  { key: "dateAdded", label: "Show Date Added" },
  { key: "annotation", label: "Show Annotation" },
];

export function DisplaySection() {
  const { state, actions } = useView();
  const listColumns = useListColumns();
  const id = useId();
  const list = state.layout === "list";

  return (
    <div className={styles.rows}>
      {list
        ? LIST_TOGGLES.map(({ key, label }) => (
            <label key={key} htmlFor={`${id}-${key}`} className={styles.row}>
              <span className={styles.label}>{label}</span>
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
