import { Group } from "@/components/library-view-menu-group";
import { useView } from "@/hooks/use-view";
import { DISPLAY_DEFAULTS, type DisplayPrefKey } from "@/stores/display-prefs";
import styles from "./styles.module.css";

const TOGGLES: Array<{ key: DisplayPrefKey; label: string }> = [
  { key: "name", label: "Name" },
  { key: "date", label: "Date" },
  { key: "source", label: "Source" },
  { key: "type", label: "Type" },
  { key: "fileCount", label: "File count" },
];

export function DisplaySection() {
  const { state, actions } = useView();
  const changed = TOGGLES.some(
    ({ key }) => state.displayPrefs[key] !== DISPLAY_DEFAULTS[key],
  );

  return (
    <Group title="Display" changed={changed}>
      <div className={styles["chip-list"]}>
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
