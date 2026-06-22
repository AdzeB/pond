import { useView } from "@/hooks/use-view";
import type { DisplayPrefKey } from "@/stores/display-prefs";
import { Group } from "../../group";
import styles from "../../styles.module.css";

const TOGGLES: Array<{ key: DisplayPrefKey; label: string }> = [
  { key: "name", label: "Name" },
  { key: "date", label: "Date" },
  { key: "source", label: "Source" },
  { key: "type", label: "Type" },
  { key: "fileCount", label: "File count" },
];

export function DisplaySection() {
  const { state, actions } = useView();

  return (
    <Group title="Display">
      <div className={styles.chipList}>
        {TOGGLES.map(({ key, label }) => {
          const active = state.displayPrefs[key];
          return (
            <button
              key={key}
              type="button"
              className={styles.chip}
              aria-pressed={active}
              data-active={active}
              onClick={() => actions.setDisplayPref(key, !active)}
            >
              {label}
            </button>
          );
        })}
      </div>
    </Group>
  );
}
