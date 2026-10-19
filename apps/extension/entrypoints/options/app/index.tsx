import { sourceLabel } from "@pond/schema/source-ids";
import type { ExternalSource } from "@pond/schema/sources";
import { Button } from "@pond/ui/button";
import { Select } from "@pond/ui/select";
import { Settings } from "@pond/ui/settings";
import { Switch } from "@pond/ui/switch";
import { Fragment, useEffect, useState } from "react";
import { HOOK_SOURCE_IDS, hasLikes } from "@/sources";
import type { ToolbarAction } from "@/utils/types";
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

const COMMAND_LABELS = new Map([
  ["_execute_action", "Open Pond"],
  ["save-page", "Save Page"],
  ["screenshot-region", "Screenshot Region"],
]);

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
                <Select.Root
                  items={TOOLBAR_ITEMS}
                  value={settings.toolbar}
                  onValueChange={(toolbar) => {
                    if (toolbar) update((current) => ({ ...current, toolbar }));
                  }}
                >
                  <Select.Trigger aria-label="Toolbar Button">
                    <Select.Value />
                  </Select.Trigger>
                  <Select.Portal>
                    <Select.Positioner>
                      <Select.Popup>
                        <Select.Items items={TOOLBAR_ITEMS} />
                      </Select.Popup>
                    </Select.Positioner>
                  </Select.Portal>
                </Select.Root>
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
