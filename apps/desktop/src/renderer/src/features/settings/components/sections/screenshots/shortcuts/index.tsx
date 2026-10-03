import { Settings, Switch } from "@pond/ui";
import { useId } from "react";
import { usePrefs } from "@/features/settings/state/prefs";
import { ShortcutSettings } from "@/features/shortcuts";
import { AnimateHeight } from "@/shared/components/animate-height";
import styles from "./styles.module.css";

export function ScreenshotShortcuts() {
  const [prefs, patch, loaded] = usePrefs("screenshots");
  const titleId = useId();
  const descriptionId = useId();
  return (
    <ShortcutSettings
      only={["capture.area", "capture.window", "capture.screen"]}
      renderList={(rows) => (
        <Settings.List>
          <AnimateHeight initial={false}>
            <Settings.Item id="setting-screenshots-shortcutsEnabled">
              <Settings.ItemDetails>
                <Settings.ItemTitle id={titleId}>
                  Enable Screenshot Shortcuts
                </Settings.ItemTitle>
                <Settings.ItemDescription id={descriptionId}>
                  Capture while working in another app.
                </Settings.ItemDescription>
              </Settings.ItemDetails>
              <Settings.ItemControl>
                <Switch.Root
                  aria-labelledby={titleId}
                  aria-describedby={descriptionId}
                  aria-controls={
                    prefs.shortcutsEnabled ? `${titleId}-rows` : undefined
                  }
                  checked={prefs.shortcutsEnabled}
                  disabled={!loaded}
                  onCheckedChange={(shortcutsEnabled) => {
                    void patch({ shortcutsEnabled });
                  }}
                />
              </Settings.ItemControl>
            </Settings.Item>
            {prefs.shortcutsEnabled ? (
              <div id={`${titleId}-rows`} className={styles.rows}>
                {rows}
              </div>
            ) : null}
          </AnimateHeight>
        </Settings.List>
      )}
    />
  );
}
