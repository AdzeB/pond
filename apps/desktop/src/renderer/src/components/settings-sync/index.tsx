import { type Source, sourceLabel } from "@pond/schema";
import { Settings, Switch } from "@pond/ui";
import { type EnumOption, EnumSelect } from "@/components/enum-select";
import { usePrefs } from "@/stores/prefs";

const INTERVAL_OPTIONS: readonly EnumOption<number>[] = [
  { value: 1, label: "Every hour" },
  { value: 3, label: "Every 3 hours" },
  { value: 6, label: "Every 6 hours" },
  { value: 12, label: "Every 12 hours" },
  { value: 24, label: "Once a day" },
];

export function SyncSection() {
  const [prefs, patch] = usePrefs("sync");
  const cron = prefs.cron ?? { enabled: true, intervalHours: 6 };
  const handles = prefs.handles ?? {};
  const connected = Object.entries(handles) as [Source, string][];

  return (
    <>
      <Settings.Section>
        <Settings.SectionTitle>Background sync</Settings.SectionTitle>
        <Settings.List>
          <Settings.Item>
            <Settings.ItemDetails>
              <Settings.ItemTitle>Sync automatically</Settings.ItemTitle>
              <Settings.ItemDescription>
                Pull new saves from connected sources on a schedule.
              </Settings.ItemDescription>
            </Settings.ItemDetails>
            <Settings.ItemControl>
              <Switch.Root
                checked={cron.enabled}
                onCheckedChange={(v) =>
                  patch({ cron: { ...cron, enabled: v } })
                }
              />
            </Settings.ItemControl>
          </Settings.Item>

          {cron.enabled ? (
            <Settings.Item>
              <Settings.ItemDetails>
                <Settings.ItemTitle>Frequency</Settings.ItemTitle>
                <Settings.ItemDescription>
                  How often to check for new saves. Pond paces requests to stay
                  account-safe.
                </Settings.ItemDescription>
              </Settings.ItemDetails>
              <Settings.ItemControl>
                <EnumSelect<number>
                  value={cron.intervalHours}
                  onValueChange={(v) =>
                    patch({ cron: { ...cron, intervalHours: v } })
                  }
                  options={INTERVAL_OPTIONS}
                />
              </Settings.ItemControl>
            </Settings.Item>
          ) : null}
        </Settings.List>
      </Settings.Section>

      <Settings.Section>
        <Settings.SectionTitle>Connected accounts</Settings.SectionTitle>
        <Settings.List>
          {connected.length > 0 ? (
            connected.map(([source, handle]) => (
              <Settings.Item key={source}>
                <Settings.ItemDetails>
                  <Settings.ItemTitle>{sourceLabel(source)}</Settings.ItemTitle>
                  <Settings.ItemDescription>{handle}</Settings.ItemDescription>
                </Settings.ItemDetails>
              </Settings.Item>
            ))
          ) : (
            <Settings.Item>
              <Settings.ItemDetails>
                <Settings.ItemTitle>No accounts connected</Settings.ItemTitle>
                <Settings.ItemDescription>
                  Connect a source from the sidebar to start syncing.
                </Settings.ItemDescription>
              </Settings.ItemDetails>
            </Settings.Item>
          )}
        </Settings.List>
      </Settings.Section>
    </>
  );
}
