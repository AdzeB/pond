import { Button, Select, Settings, Switch } from "@pond/ui";
import type { QueryResult } from "@shared/query-contracts";
import { useCallback, useEffect, useState } from "react";

const MODE_OPTIONS = [
  { value: "copy" as const, label: "Copy files" },
  { value: "move" as const, label: "Move files" },
];

type Status = QueryResult<"autoImport.status">;

export function AutoImportSettings() {
  const [status, setStatus] = useState<Status | null>(null);

  const refresh = useCallback(async () => {
    setStatus(await window.pond.query("autoImport.status", {}));
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (!status) return null;

  async function setEnabled(enabled: boolean) {
    await window.pond.query("autoImport.set", { enabled });
    await refresh();
  }

  async function setMode(mode: "copy" | "move") {
    await window.pond.query("autoImport.set", { mode });
    await refresh();
  }

  async function chooseFolder() {
    await window.pond.query("autoImport.pickFolder", {});
    await refresh();
  }

  const history = status.history.slice(0, 8);

  return (
    <Settings.List>
      <Settings.Item id="setting-harvesting-watched-folder">
        <Settings.ItemDetails>
          <Settings.ItemTitle>Watched Folder</Settings.ItemTitle>
          <Settings.ItemDescription>
            Import files that appear in one folder on this Mac.
          </Settings.ItemDescription>
        </Settings.ItemDetails>
        <Settings.ItemControl>
          <Switch.Root
            aria-label="Watch a Folder"
            checked={status.enabled}
            onCheckedChange={(enabled) => {
              void setEnabled(enabled);
            }}
          />
        </Settings.ItemControl>
      </Settings.Item>
      {status.enabled ? (
        <>
          <Settings.Item>
            <Settings.ItemDetails>
              <Settings.ItemTitle>Folder</Settings.ItemTitle>
              <Settings.ItemDescription>
                {status.path || "Choose a folder to watch."}
              </Settings.ItemDescription>
            </Settings.ItemDetails>
            <Settings.ItemControl>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => void chooseFolder()}
              >
                Choose Folder
              </Button>
            </Settings.ItemControl>
          </Settings.Item>
          <Settings.Item>
            <Settings.ItemDetails>
              <Settings.ItemTitle>Import Mode</Settings.ItemTitle>
              <Settings.ItemDescription>
                Copy leaves the original in place. Move deletes it after import.
              </Settings.ItemDescription>
            </Settings.ItemDetails>
            <Settings.ItemControl>
              <Select.Root
                value={status.mode}
                onValueChange={(next) => {
                  if (next === "copy" || next === "move") void setMode(next);
                }}
              >
                <Select.Trigger aria-label="Import Mode">
                  <Select.Value>
                    {(value: string) =>
                      MODE_OPTIONS.find((option) => option.value === value)
                        ?.label ?? value
                    }
                  </Select.Value>
                </Select.Trigger>
                <Select.Portal>
                  <Select.Positioner sideOffset={6}>
                    <Select.Popup>
                      <Select.Items items={[...MODE_OPTIONS]} />
                    </Select.Popup>
                  </Select.Positioner>
                </Select.Portal>
              </Select.Root>
            </Settings.ItemControl>
          </Settings.Item>
          {history.length > 0 ? (
            <Settings.Item>
              <Settings.ItemDetails>
                <Settings.ItemTitle>Recent Imports</Settings.ItemTitle>
                <Settings.ItemDescription>
                  {history
                    .map((entry) =>
                      entry.ok ? entry.name : `${entry.name} failed`,
                    )
                    .join(", ")}
                </Settings.ItemDescription>
              </Settings.ItemDetails>
            </Settings.Item>
          ) : null}
        </>
      ) : null}
    </Settings.List>
  );
}
