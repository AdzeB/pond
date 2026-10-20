import { IconArrowLeft } from "@pond/icons";
import { Button } from "@pond/ui/button";
import { Keyboard } from "@pond/ui/keyboard";
import { Pane } from "@pond/ui/pane-header";
import { Settings } from "@pond/ui/settings";
import { useShortcuts } from "../../hooks";
import styles from "./styles.module.css";

const COMMANDS = [
  { name: "_execute_action", label: "Open Pond" },
  { name: "save-page", label: "Save Page" },
  { name: "save-images", label: "Save Images" },
  { name: "screenshot-region", label: "Capture Region" },
  { name: "screenshot-visible", label: "Capture Visible Area" },
  { name: "screenshot-full", label: "Capture Full Page" },
] as const;

interface ShortcutsPanelProps {
  onBack: () => void;
}

export function ShortcutsPanel({ onBack }: ShortcutsPanelProps) {
  const shortcuts = useShortcuts();

  return (
    <div className={styles.panel}>
      <Pane.Header
        title={
          <>
            <Button
              icon
              size="sm"
              variant="ghost"
              aria-label="Back"
              onClick={onBack}
            >
              <IconArrowLeft size={16} />
            </Button>
            Shortcuts
          </>
        }
      />
      <div className={styles.scroll}>
        <Settings.Page density="compact">
          <Settings.Section>
            <Settings.List>
              {COMMANDS.map(({ name, label }) => {
                const keys = shortcuts.get(name);
                return (
                  <Settings.Item key={name}>
                    <Settings.ItemDetails>
                      <Settings.ItemTitle>{label}</Settings.ItemTitle>
                    </Settings.ItemDetails>
                    <Settings.ItemControl>
                      {keys ? (
                        <Keyboard.Cluster keys={keys} density="inline" />
                      ) : (
                        <span className={styles.unset}>Not set</span>
                      )}
                    </Settings.ItemControl>
                  </Settings.Item>
                );
              })}
            </Settings.List>
          </Settings.Section>
          <Settings.Section>
            <Settings.List>
              <Settings.Item>
                <Settings.ItemDetails>
                  <Settings.ItemTitle>Change Shortcuts</Settings.ItemTitle>
                  {import.meta.env.FIREFOX ? (
                    <Settings.ItemDescription>
                      In Add-ons and Themes, click the gear, then Manage
                      Extension Shortcuts.
                    </Settings.ItemDescription>
                  ) : null}
                </Settings.ItemDetails>
                {import.meta.env.FIREFOX ? null : (
                  <Settings.ItemControl>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        void browser.tabs.create({
                          url: "chrome://extensions/shortcuts",
                        })
                      }
                    >
                      Open
                    </Button>
                  </Settings.ItemControl>
                )}
              </Settings.Item>
            </Settings.List>
          </Settings.Section>
        </Settings.Page>
      </div>
    </div>
  );
}
