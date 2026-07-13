import { type Source, sourceLabel } from "@pond/schema";
import { Settings, Switch } from "@pond/ui";
import { type EnumOption, EnumSelect } from "@/components/enum-select";
import { type Binding, defineSection } from "@/lib/settings/engine-types";

const INTERVAL_OPTIONS: readonly EnumOption<number>[] = [
  { value: 1, label: "Every hour" },
  { value: 3, label: "Every 3 hours" },
  { value: 6, label: "Every 6 hours" },
  { value: 12, label: "Every 12 hours" },
  { value: 24, label: "Once a day" },
];

interface CronPref {
  enabled: boolean;
  intervalHours: number;
}

/** Mirrors ConnectedAccount from the schema; only the fields this list shows. */
interface AccountEntry {
  id: string;
  source: Source;
  handle: string | null;
  label: string | null;
  addedAt: string;
}

interface SyncValues {
  cron?: CronPref;
  accounts?: Record<string, AccountEntry>;
}

const DEFAULT_CRON: CronPref = { enabled: true, intervalHours: 6 };

function cronOf(binding: Binding): CronPref {
  return (binding.values as SyncValues).cron ?? DEFAULT_CRON;
}

function SyncAutomaticallyRow({ binding }: { binding: Binding }) {
  const cron = cronOf(binding);
  return (
    <>
      <Settings.ItemDetails>
        <Settings.ItemTitle>Sync Automatically</Settings.ItemTitle>
        <Settings.ItemDescription>
          Pull new saves from connected sources on a schedule.
        </Settings.ItemDescription>
      </Settings.ItemDetails>
      <Settings.ItemControl>
        <Switch.Root
          checked={cron.enabled}
          onCheckedChange={(v) =>
            binding.patch({ cron: { ...cron, enabled: v } })
          }
        />
      </Settings.ItemControl>
    </>
  );
}

function FrequencyRow({ binding }: { binding: Binding }) {
  const cron = cronOf(binding);
  return (
    <>
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
            binding.patch({ cron: { ...cron, intervalHours: v } })
          }
          options={INTERVAL_OPTIONS}
        />
      </Settings.ItemControl>
    </>
  );
}

function ConnectedAccounts({ binding }: { binding: Binding }) {
  const registry = (binding.values as SyncValues).accounts ?? {};
  const accounts = Object.values(registry).sort((a, b) =>
    a.addedAt.localeCompare(b.addedAt),
  );
  if (accounts.length === 0) {
    return (
      <Settings.Empty
        title="No accounts connected"
        description="Connect a source from the Sources page to start syncing."
      />
    );
  }
  return (
    <Settings.List>
      {accounts.map((account) => (
        <Settings.Item key={account.id}>
          <Settings.ItemDetails>
            <Settings.ItemTitle>
              {sourceLabel(account.source)}
              {account.label ? ` · ${account.label}` : ""}
            </Settings.ItemTitle>
            <Settings.ItemDescription>
              {account.handle ? `@${account.handle}` : "Signed in"}
            </Settings.ItemDescription>
          </Settings.ItemDetails>
        </Settings.Item>
      ))}
    </Settings.List>
  );
}

export const syncSection = defineSection("sync", {
  title: "Sync",
  description: "Keep your library up to date with connected sources.",
  groups: [
    {
      title: "Background Sync",
      items: [
        {
          control: "custom",
          key: "sync-automatically",
          title: "Sync Automatically",
          keywords: ["schedule", "background", "cron", "automatic"],
          render: (binding) => <SyncAutomaticallyRow binding={binding} />,
        },
        {
          control: "custom",
          key: "frequency",
          title: "Frequency",
          keywords: ["interval", "schedule", "hours", "how often"],
          visible: (values) =>
            (values as SyncValues).cron?.enabled ?? DEFAULT_CRON.enabled,
          render: (binding) => <FrequencyRow binding={binding} />,
        },
      ],
    },
    {
      title: "Connected Accounts",
      render: (binding) => <ConnectedAccounts binding={binding} />,
    },
  ],
});
