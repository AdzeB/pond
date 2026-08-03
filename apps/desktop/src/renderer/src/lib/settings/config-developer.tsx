import { Button, Settings, Switch } from "@pond/ui";
import { type ReactNode, useState } from "react";
import { VerifyRow } from "@/components/settings/sections/developer-verify-row";
import { confirm } from "@/components/shared/confirm-dialog";
import { type Binding, defineSection } from "@/lib/settings/engine-types";
import { reloadPrefs } from "@/stores/prefs";

function query(channel: string, payload: Record<string, unknown> = {}) {
  return window.pond.query(channel, payload);
}

function VerboseLoggingRow({ binding }: { binding: Binding }) {
  const checked = (binding.values as { verboseLogging?: boolean })
    .verboseLogging;
  return (
    <>
      <Settings.ItemDetails>
        <Settings.ItemTitle>Verbose Logging</Settings.ItemTitle>
        <Settings.ItemDescription>
          Capture every IPC and executor call. Slows Pond down.
        </Settings.ItemDescription>
      </Settings.ItemDetails>
      <Settings.ItemControl>
        <Switch.Root
          checked={checked === true}
          onCheckedChange={(v) => {
            binding.patch({ verboseLogging: v });
            void query("developer.applyVerboseLogging", { verbose: v });
          }}
        />
      </Settings.ItemControl>
    </>
  );
}

function BusyActionRow({
  title,
  description,
  label,
  busyLabel,
  run,
}: {
  title: string;
  description: ReactNode;
  label: string;
  busyLabel: string;
  run: () => Promise<unknown>;
}) {
  const [busy, setBusy] = useState(false);
  async function onClick() {
    setBusy(true);
    try {
      await run();
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Settings.ItemDetails>
        <Settings.ItemTitle>{title}</Settings.ItemTitle>
        <Settings.ItemDescription>{description}</Settings.ItemDescription>
      </Settings.ItemDetails>
      <Settings.ItemControl>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => void onClick()}
          disabled={busy}
        >
          {busy ? busyLabel : label}
        </Button>
      </Settings.ItemControl>
    </>
  );
}

function FactoryResetRow() {
  return (
    <>
      <Settings.ItemDetails>
        <Settings.ItemTitle>Factory Reset</Settings.ItemTitle>
        <Settings.ItemDescription>
          Drop the SQLite index. Rebuilds from metadata on next launch.
        </Settings.ItemDescription>
      </Settings.ItemDetails>
      <Settings.ItemControl>
        <Button
          size="sm"
          variant="destructive"
          onClick={() =>
            confirm({
              title: "Factory Reset?",
              description:
                "This wipes the SQLite index and prefs. Saves on disk stay put.",
              confirmLabel: "Wipe & Restart",
              busyLabel: "Resetting",
              onConfirm: () => query("reset.factory").then(() => undefined),
            })
          }
        >
          Factory Reset
        </Button>
      </Settings.ItemControl>
    </>
  );
}

export const developerSection = defineSection("developer", {
  title: "Developer",
  description: "Diagnostics, maintenance, and reset tools.",
  groups: [
    {
      title: "Diagnostics",
      items: [
        {
          control: "button",
          key: "open-logs",
          title: "Open Log Directory",
          description: "Reveal electron-log files in your file manager.",
          keywords: ["logs", "electron-log", "debug"],
          label: "Reveal",
          onClick: () => void query("developer.openLogs"),
        },
        {
          control: "custom",
          key: "verboseLogging",
          title: "Verbose Logging",
          keywords: ["logs", "ipc", "trace", "debug"],
          render: (binding) => <VerboseLoggingRow binding={binding} />,
        },
        {
          control: "button",
          key: "open-inspector",
          title: "Open IPC Inspector",
          description: "Read-only view of recent IPC traffic.",
          keywords: ["ipc", "inspector", "traffic", "debug"],
          label: "Open Inspector",
          onClick: () => void query("developer.openIpcInspector"),
        },
      ],
    },
    {
      title: "Maintenance",
      items: [
        {
          control: "custom",
          key: "rescan",
          title: "Rescan Library",
          keywords: ["reindex", "refresh", "scan", "disk"],
          render: () => (
            <BusyActionRow
              title="Rescan Library"
              description="Re-read library files from disk and refresh the index."
              label="Rescan"
              busyLabel="Rescanning"
              run={() => query("library.rescan")}
            />
          ),
        },
        {
          control: "custom",
          key: "verify",
          title: "Verify Integrity",
          keywords: ["integrity", "check", "database"],
          render: () => <VerifyRow />,
        },
        {
          control: "custom",
          key: "archive-backfill",
          title: "Archive Web Saves",
          keywords: [
            "archive",
            "warc",
            "replay",
            "site",
            "snapshot",
            "backfill",
          ],
          render: () => (
            <BusyActionRow
              title="Archive Web Saves"
              description="Capture a browsable archive of the saved page for web saves that don't have one yet."
              label="Archive"
              busyLabel="Queueing"
              run={() => window.pond.archiveBackfillStart()}
            />
          ),
        },
      ],
    },
    {
      title: "Caches",
      items: [
        {
          control: "custom",
          key: "clear-video-cache",
          title: "Clear Video Cache",
          keywords: ["cache", "video", "mp4", "delete"],
          render: () => (
            <BusyActionRow
              title="Clear Video Cache"
              description={
                <>
                  Delete every cached MP4 under <code>_video_cache/</code>.
                </>
              }
              label="Clear Cache"
              busyLabel="Clearing"
              run={() => query("reset.clearVideoCache")}
            />
          ),
        },
        {
          control: "custom",
          key: "clear-thumbnails",
          title: "Clear Thumbnails",
          keywords: ["cache", "thumbnails", "previews", "delete"],
          render: () => (
            <BusyActionRow
              title="Clear Thumbnails"
              description={
                <>
                  Delete every cached preview tile under <code>_thumbs/</code>.
                </>
              }
              label="Clear Thumbnails"
              busyLabel="Clearing"
              run={() => query("reset.clearThumbnails")}
            />
          ),
        },
      ],
    },
    {
      title: "Reset Preferences",
      items: [
        {
          control: "custom",
          key: "reset-preferences",
          title: "Reset Preferences",
          keywords: ["reset", "defaults", "restore", "preferences"],
          render: () => (
            <BusyActionRow
              title="Reset Preferences"
              description="Restore every Settings knob to its default."
              label="Reset"
              busyLabel="Resetting"
              run={async () => {
                await query("reset.preferences");
                await reloadPrefs();
              }}
            />
          ),
        },
      ],
    },
    {
      title: "Danger Zone",
      items: [
        {
          control: "custom",
          key: "factory-reset",
          title: "Factory Reset",
          keywords: ["factory", "reset", "wipe", "sqlite", "danger"],
          render: () => <FactoryResetRow />,
        },
      ],
    },
  ],
});
