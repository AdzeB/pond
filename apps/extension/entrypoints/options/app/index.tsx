import { sourceLabel } from "@pond/schema/source-ids";
import type { ExternalSource } from "@pond/schema/sources";
import { Button } from "@pond/ui/button";
import { Select } from "@pond/ui/select";
import { Settings } from "@pond/ui/settings";
import { Switch } from "@pond/ui/switch";
import { Fragment, useEffect, useState } from "react";
import { HOOK_SOURCE_IDS, hasLikes } from "@/sources";
import type {
  ScreenshotFormat,
  ThemePreference,
  ToolbarAction,
} from "@/utils/types";
import { useLibrary } from "@/utils/use-library";
import { useSettings } from "@/utils/use-settings";
import styles from "./styles.module.css";

const SAVES = {
  twitter: "Save posts when you bookmark them.",
  instagram: "Save posts when you save them to a collection.",
  pinterest: "Save Pins when you save them to a board.",
  arena: "Save blocks when you connect them to a channel.",
  cosmos: "Save elements when you save them to a cluster.",
  tiktok: "Save videos when you add them to Favorites.",
  youtube: "Save videos when you add them to a playlist.",
  reddit: "Save posts when you save them.",
  threads: "Save posts when you save them.",
} satisfies Record<ExternalSource, string>;

const TOOLBAR_ITEMS: { value: ToolbarAction; label: string }[] = [
  { value: "popup", label: "Open Panel" },
  { value: "save", label: "Save Page" },
];

const THEME_ITEMS: { value: ThemePreference; label: string }[] = [
  { value: "library", label: "Match Library" },
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

const FORMAT_ITEMS: { value: ScreenshotFormat; label: string }[] = [
  { value: "png", label: "PNG" },
  { value: "jpeg", label: "JPEG" },
];

const COMMAND_LABELS = new Map([
  ["_execute_action", "Open Pond"],
  ["save-page", "Save Page"],
  ["save-images", "Save Images"],
  ["screenshot-region", "Capture Region"],
  ["screenshot-visible", "Capture Visible Area"],
  ["screenshot-full", "Capture Full Page"],
]);

interface ChoiceProps<Value extends string> {
  label: string;
  items: { value: Value; label: string }[];
  value: Value;
  onValueChange: (value: Value) => void;
}

function Choice<Value extends string>({
  label,
  items,
  value,
  onValueChange,
}: ChoiceProps<Value>) {
  return (
    <Select.Root
      items={items}
      value={value}
      onValueChange={(next) => {
        if (next) onValueChange(next);
      }}
    >
      <Select.Trigger aria-label={label}>
        <Select.Value />
      </Select.Trigger>
      <Select.Portal>
        <Select.Positioner>
          <Select.Popup>
            <Select.Items items={items} />
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
}

interface Shortcut {
  name: string;
  label: string;
  keys: string;
}

function useShortcuts(): Shortcut[] {
  const [shortcuts, setShortcuts] = useState<Shortcut[]>([]);
  useEffect(() => {
    void browser.commands?.getAll().then((all) =>
      setShortcuts(
        all.flatMap((command) => {
          const label = command.name && COMMAND_LABELS.get(command.name);
          return command.name && label
            ? [{ name: command.name, label, keys: command.shortcut ?? "" }]
            : [];
        }),
      ),
    );
  }, []);
  return shortcuts;
}

export function App() {
  useLibrary();
  const { settings, update } = useSettings();
  const shortcuts = useShortcuts();

  if (!settings) return null;

  const setSource = (source: ExternalSource, on: boolean) =>
    update((current) => ({
      ...current,
      enabled: { ...current.enabled, [source]: on },
    }));
  const setLikes = (source: ExternalSource, on: boolean) =>
    update((current) => ({
      ...current,
      likes: { ...current.likes, [source]: on },
    }));

  return (
    <div className={styles.body}>
      <Settings.Page>
        <Settings.Header>
          <Settings.HeaderText>
            <Settings.Title>Pond</Settings.Title>
            <Settings.Description>
              Saves go straight to the Pond Library open on your computer.
            </Settings.Description>
          </Settings.HeaderText>
        </Settings.Header>

        <Settings.Section>
          <Settings.SectionTitle>General</Settings.SectionTitle>
          <Settings.List>
            <Settings.Item>
              <Settings.ItemDetails>
                <Settings.ItemTitle>Toolbar Button</Settings.ItemTitle>
                <Settings.ItemDescription>
                  Save Page skips the panel and saves in one click.
                </Settings.ItemDescription>
              </Settings.ItemDetails>
              <Settings.ItemControl>
                <Choice
                  label="Toolbar Button"
                  items={TOOLBAR_ITEMS}
                  value={settings.toolbar}
                  onValueChange={(toolbar) =>
                    update((current) => ({ ...current, toolbar }))
                  }
                />
              </Settings.ItemControl>
            </Settings.Item>
            <Settings.Item>
              <Settings.ItemDetails>
                <Settings.ItemTitle>Theme</Settings.ItemTitle>
                <Settings.ItemDescription>
                  Match Library uses the colors of the Pond Library you have
                  open.
                </Settings.ItemDescription>
              </Settings.ItemDetails>
              <Settings.ItemControl>
                <Choice
                  label="Theme"
                  items={THEME_ITEMS}
                  value={settings.theme}
                  onValueChange={(theme) =>
                    update((current) => ({ ...current, theme }))
                  }
                />
              </Settings.ItemControl>
            </Settings.Item>
            <Settings.Item>
              <Settings.ItemDetails>
                <Settings.ItemTitle>Show Confirmations</Settings.ItemTitle>
                <Settings.ItemDescription>
                  When off, the Pond icon shows a badge instead of a notice on
                  the page.
                </Settings.ItemDescription>
              </Settings.ItemDetails>
              <Settings.ItemControl>
                <Switch.Root
                  aria-label="Show Confirmations"
                  checked={settings.confirmations}
                  onCheckedChange={(confirmations) =>
                    update((current) => ({ ...current, confirmations }))
                  }
                />
              </Settings.ItemControl>
            </Settings.Item>
          </Settings.List>
        </Settings.Section>

        <Settings.Section>
          <Settings.SectionTitle>Saving</Settings.SectionTitle>
          <Settings.List>
            <Settings.Item>
              <Settings.ItemDetails>
                <Settings.ItemTitle>Ask Where to Save</Settings.ItemTitle>
                <Settings.ItemDescription>
                  Pick a name, rating, tags, and folders on the page before each
                  save.
                </Settings.ItemDescription>
              </Settings.ItemDetails>
              <Settings.ItemControl>
                <Switch.Root
                  aria-label="Ask Where to Save"
                  checked={settings.askDetails}
                  onCheckedChange={(askDetails) =>
                    update((current) => ({ ...current, askDetails }))
                  }
                />
              </Settings.ItemControl>
            </Settings.Item>
            <Settings.Item>
              <Settings.ItemDetails>
                <Settings.ItemTitle>Alt-Right-Click to Save</Settings.ItemTitle>
                <Settings.ItemDescription>
                  Hold Alt, or Option on a Mac, and right-click an image or link
                  to save it.
                </Settings.ItemDescription>
              </Settings.ItemDetails>
              <Settings.ItemControl>
                <Switch.Root
                  aria-label="Alt-Right-Click to Save"
                  checked={settings.altClick}
                  onCheckedChange={(altClick) =>
                    update((current) => ({ ...current, altClick }))
                  }
                />
              </Settings.ItemControl>
            </Settings.Item>
            <Settings.Item>
              <Settings.ItemDetails>
                <Settings.ItemTitle>Drag to Save</Settings.ItemTitle>
                <Settings.ItemDescription>
                  Dragging an image or link shows drop targets for Pond and your
                  recent folders.
                </Settings.ItemDescription>
              </Settings.ItemDetails>
              <Settings.ItemControl>
                <Switch.Root
                  aria-label="Drag to Save"
                  checked={settings.dragToSave}
                  onCheckedChange={(dragToSave) =>
                    update((current) => ({ ...current, dragToSave }))
                  }
                />
              </Settings.ItemControl>
            </Settings.Item>
            {settings.dragBlocked.map((host) => (
              <Settings.Item key={host} disabled={!settings.dragToSave}>
                <Settings.ItemDetails>
                  <Settings.ItemTitle>{host}</Settings.ItemTitle>
                  <Settings.ItemDescription>
                    Drag to Save is off on this site.
                  </Settings.ItemDescription>
                </Settings.ItemDetails>
                <Settings.ItemControl>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={!settings.dragToSave}
                    onClick={() =>
                      update((current) => ({
                        ...current,
                        dragBlocked: current.dragBlocked.filter(
                          (blocked) => blocked !== host,
                        ),
                      }))
                    }
                  >
                    Turn On
                  </Button>
                </Settings.ItemControl>
              </Settings.Item>
            ))}
          </Settings.List>
        </Settings.Section>

        <Settings.Section>
          <Settings.SectionTitle>Screenshots</Settings.SectionTitle>
          <Settings.List>
            <Settings.Item>
              <Settings.ItemDetails>
                <Settings.ItemTitle>Format</Settings.ItemTitle>
                <Settings.ItemDescription>
                  PNG keeps text sharp, and JPEG makes smaller files.
                </Settings.ItemDescription>
              </Settings.ItemDetails>
              <Settings.ItemControl>
                <Choice
                  label="Format"
                  items={FORMAT_ITEMS}
                  value={settings.screenshotFormat}
                  onValueChange={(screenshotFormat) =>
                    update((current) => ({ ...current, screenshotFormat }))
                  }
                />
              </Settings.ItemControl>
            </Settings.Item>
            <Settings.Item>
              <Settings.ItemDetails>
                <Settings.ItemTitle>Full Resolution</Settings.ItemTitle>
                <Settings.ItemDescription>
                  Saves every pixel a high-density display shows, not just the
                  size the page appears.
                </Settings.ItemDescription>
              </Settings.ItemDetails>
              <Settings.ItemControl>
                <Switch.Root
                  aria-label="Full Resolution"
                  checked={settings.retina}
                  onCheckedChange={(retina) =>
                    update((current) => ({ ...current, retina }))
                  }
                />
              </Settings.ItemControl>
            </Settings.Item>
          </Settings.List>
        </Settings.Section>

        <Settings.Section>
          <Settings.SectionTitle>Sources</Settings.SectionTitle>
          <Settings.List>
            {HOOK_SOURCE_IDS.map((source) => {
              const label = sourceLabel(source);
              const on = settings.enabled[source];
              const upvotes = source === "reddit";
              return (
                <Fragment key={source}>
                  <Settings.Item>
                    <Settings.ItemDetails>
                      <Settings.ItemTitle>{label}</Settings.ItemTitle>
                      <Settings.ItemDescription>
                        {SAVES[source]}
                      </Settings.ItemDescription>
                    </Settings.ItemDetails>
                    <Settings.ItemControl>
                      <Switch.Root
                        aria-label={label}
                        checked={on}
                        onCheckedChange={(next) => setSource(source, next)}
                      />
                    </Settings.ItemControl>
                  </Settings.Item>
                  {hasLikes(source) ? (
                    <Settings.Item disabled={!on}>
                      <Settings.ItemDetails>
                        <Settings.ItemTitle>
                          {upvotes ? "Include Upvotes" : "Include Likes"}
                        </Settings.ItemTitle>
                        <Settings.ItemDescription>
                          {upvotes
                            ? "Also save posts you upvote."
                            : "Also save what you like."}
                        </Settings.ItemDescription>
                      </Settings.ItemDetails>
                      <Settings.ItemControl>
                        <Switch.Root
                          aria-label={`${label} ${upvotes ? "upvotes" : "likes"}`}
                          disabled={!on}
                          checked={settings.likes[source]}
                          onCheckedChange={(next) => setLikes(source, next)}
                        />
                      </Settings.ItemControl>
                    </Settings.Item>
                  ) : null}
                </Fragment>
              );
            })}
          </Settings.List>
        </Settings.Section>

        <Settings.Section>
          <Settings.SectionTitle>Shortcuts</Settings.SectionTitle>
          <Settings.List>
            {shortcuts.map(({ name, label, keys }) => (
              <Settings.Item key={name}>
                <Settings.ItemDetails>
                  <Settings.ItemTitle>{label}</Settings.ItemTitle>
                </Settings.ItemDetails>
                <Settings.ItemControl>
                  <kbd className={styles.shortcut}>{keys || "Not set"}</kbd>
                </Settings.ItemControl>
              </Settings.Item>
            ))}
            <Settings.Item>
              <Settings.ItemDetails>
                <Settings.ItemTitle>Change Shortcuts</Settings.ItemTitle>
                <Settings.ItemDescription>
                  {import.meta.env.FIREFOX
                    ? "In Add-ons and Themes, click the gear, then Manage Extension Shortcuts."
                    : "Your browser keeps extension shortcuts on its own page."}
                </Settings.ItemDescription>
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
                    Open Shortcuts
                  </Button>
                </Settings.ItemControl>
              )}
            </Settings.Item>
          </Settings.List>
        </Settings.Section>
      </Settings.Page>
    </div>
  );
}
