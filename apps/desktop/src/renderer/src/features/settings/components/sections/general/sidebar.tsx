import { Settings, Switch } from "@pond/ui";
import { usePrefs } from "@/features/settings/state/prefs";
import { EnumSelect } from "@/shared/components/enum-select";

const DESTINATIONS = [
  ["all", "All"],
  ["uncategorized", "Uncategorized"],
  ["untagged", "Untagged"],
  ["tags", "Tags"],
  ["trash", "Trash"],
  ["downloads", "Downloads"],
  ["sources", "Sources"],
] as const;

export function SidebarPreferences() {
  const [sidebar, patch, loaded] = usePrefs("sidebar");

  return (
    <Settings.List>
      <Settings.Item>
        <Settings.ItemDetails>
          <Settings.ItemTitle>Show Counts</Settings.ItemTitle>
          <Settings.ItemDescription>
            Show Save totals beside sidebar destinations and folders.
          </Settings.ItemDescription>
        </Settings.ItemDetails>
        <Settings.ItemControl>
          <Switch.Root
            aria-label="Show Counts"
            checked={sidebar.showCounts}
            disabled={!loaded}
            onCheckedChange={(showCounts) => void patch({ showCounts })}
          />
        </Settings.ItemControl>
      </Settings.Item>
      <Settings.Item>
        <Settings.ItemDetails>
          <Settings.ItemTitle>Folder Double-Click</Settings.ItemTitle>
          <Settings.ItemDescription>
            Choose whether a folder opens or expands when you double-click it.
          </Settings.ItemDescription>
        </Settings.ItemDetails>
        <Settings.ItemControl>
          <EnumSelect<"open" | "expand-collapse">
            value={sidebar.doubleClickBehavior}
            disabled={!loaded}
            options={[
              { value: "open", label: "Open Folder" },
              { value: "expand-collapse", label: "Expand or Collapse" },
            ]}
            onValueChange={(doubleClickBehavior) =>
              void patch({ doubleClickBehavior })
            }
          />
        </Settings.ItemControl>
      </Settings.Item>
      {DESTINATIONS.map(([key, label]) => (
        <Settings.Item key={key}>
          <Settings.ItemDetails>
            <Settings.ItemTitle>{label}</Settings.ItemTitle>
          </Settings.ItemDetails>
          <Settings.ItemControl>
            <Switch.Root
              aria-label={`Show ${label}`}
              checked={sidebar.destinations[key]}
              disabled={!loaded}
              onCheckedChange={(checked) =>
                void patch({
                  destinations: { ...sidebar.destinations, [key]: checked },
                })
              }
            />
          </Settings.ItemControl>
        </Settings.Item>
      ))}
    </Settings.List>
  );
}
