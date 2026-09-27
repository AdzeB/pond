import { Button, Input, Select, Settings, Switch } from "@pond/ui";
import type { QueryInput, QueryResult } from "@shared/query-contracts";
import { useCallback, useEffect, useState } from "react";
import styles from "./styles.module.css";

type Status = QueryResult<"screenshots.status">;
type Rule = Status["intakeRules"][number];

const MODE_OPTIONS = [
  { value: "copy", label: "Copy Files" },
  { value: "move", label: "Move Files" },
];

const DUPLICATE_OPTIONS = [
  { value: "skip", label: "Skip Existing" },
  { value: "import", label: "Import Again" },
];

export function ScreenshotIntakeSettings() {
  const [status, setStatus] = useState<Status | null>(null);
  const [folders, setFolders] = useState<QueryResult<"folders.list">>([]);

  const [statusError, setStatusError] = useState("");
  const [foldersError, setFoldersError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [foldersLoaded, setFoldersLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setStatusError("");
    setFoldersError("");
    await Promise.all([
      window.pond.query("screenshots.status", {}).then(
        (next) => setStatus(next),
        () =>
          setStatusError("Couldn’t load screenshot tools and watched folders."),
      ),
      window.pond.query("folders.list", {}).then(
        (next) => {
          setFolders(next);
          setFoldersLoaded(true);
        },
        () => {
          setFoldersLoaded(false);
          setFoldersError("Couldn’t load destination folders.");
        },
      ),
    ]);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const current = status;

  async function save(patch: QueryInput<"screenshots.set">) {
    setSaveError("");
    try {
      await window.pond.query("screenshots.set", patch);
      await refresh();
    } catch {
      setSaveError("Couldn’t save screenshot settings. Try again.");
    }
  }

  async function updateRule(id: string, patch: Partial<Rule>) {
    if (!current) return;
    await save({
      intakeRules: current.intakeRules.map((rule) =>
        rule.id === id ? { ...rule, ...patch } : rule,
      ),
    });
  }

  async function addRule() {
    if (!current) return;
    setSaveError("");
    try {
      const selected = await window.pond.query("screenshots.pickFolder", {});
      if (!selected.ok || !selected.path) return;
      const name = selected.path.split(/[/\\]/).filter(Boolean).at(-1);
      await save({
        intakeRules: [
          ...current.intakeRules,
          {
            id: crypto.randomUUID(),
            name: name || "Screenshots",
            enabled: true,
            path: selected.path,
            mode: "copy",
            folderId: null,
            tags: ["Screenshot"],
            duplicatePolicy: "skip",
            autoSelect: true,
            notifications: true,
          },
        ],
      });
    } catch {
      setSaveError("Couldn’t open the folder chooser. Try again.");
    }
  }

  async function removeRule(id: string) {
    if (!current) return;
    await save({
      intakeRules: current.intakeRules.filter((rule) => rule.id !== id),
    });
  }

  const toolOptions = (status?.tools ?? [])
    .filter((tool) => tool.installed || tool.id === status?.tool)
    .map((tool) => ({
      value: tool.id,
      label: tool.installed ? tool.label : `${tool.label} (Unavailable)`,
    }));
  const folderOptions = [
    { value: "", label: "Library" },
    ...folders.map((folder) => ({ value: folder.id, label: folder.name })),
  ];

  return (
    <Settings.List>
      {(statusError || foldersError || saveError) && (
        <Settings.Item>
          <Settings.ItemDetails>
            {[statusError, foldersError, saveError]
              .filter(Boolean)
              .map((message) => (
                <Settings.ItemDescription key={message} role="alert">
                  {message}
                </Settings.ItemDescription>
              ))}
          </Settings.ItemDetails>
          {(statusError || foldersError) && (
            <Settings.ItemControl>
              <Button
                size="sm"
                variant="secondary"
                disabled={refreshing}
                onClick={() => void refresh()}
              >
                Retry
              </Button>
            </Settings.ItemControl>
          )}
        </Settings.Item>
      )}
      <Settings.Item>
        <Settings.ItemDetails>
          <Settings.ItemTitle>Screenshot Tool</Settings.ItemTitle>
          <Settings.ItemDescription>
            Choose the app Pond opens for screen captures and editing.
          </Settings.ItemDescription>
        </Settings.ItemDetails>
        <Settings.ItemControl>
          <Select.Root
            items={toolOptions}
            value={status?.tool ?? null}
            disabled={!status}
            onValueChange={(tool) => {
              if (
                tool === "native" ||
                tool === "cleanshot" ||
                tool === "shottr" ||
                tool === "pond"
              )
                void save({ tool });
            }}
          >
            <Select.Trigger aria-label="Screenshot Tool">
              <Select.Value
                placeholder={statusError ? "Unavailable" : "Loading…"}
              />
            </Select.Trigger>
            <Select.Portal>
              <Select.Positioner sideOffset={6}>
                <Select.Popup>
                  <Select.Items items={toolOptions} />
                </Select.Popup>
              </Select.Positioner>
            </Select.Portal>
          </Select.Root>
        </Settings.ItemControl>
      </Settings.Item>

      {(status?.intakeRules ?? []).map((rule) => (
        <Settings.Card key={rule.id}>
          <Settings.CardTitle>{rule.name}</Settings.CardTitle>
          <Settings.CardDescription>{rule.path}</Settings.CardDescription>
          <Settings.CardAction className={styles.actions}>
            <Switch.Root
              aria-label={`Watch ${rule.name}`}
              checked={rule.enabled}
              onCheckedChange={(enabled) => {
                void updateRule(rule.id, { enabled });
              }}
            />
            <Button
              size="xs"
              variant="ghost"
              onClick={() => void removeRule(rule.id)}
            >
              Remove
            </Button>
          </Settings.CardAction>
          {rule.enabled ? (
            <Settings.CardContent className={styles.content}>
              <label className={styles.field} htmlFor={`${rule.id}-name`}>
                <span>Name</span>
                <Input.Root size="sm">
                  <Input.Field
                    id={`${rule.id}-name`}
                    defaultValue={rule.name}
                    onBlur={(event) => {
                      const name = event.currentTarget.value.trim();
                      if (name && name !== rule.name)
                        void updateRule(rule.id, { name });
                    }}
                  />
                </Input.Root>
              </label>
              <label className={styles.field} htmlFor={`${rule.id}-tags`}>
                <span>Tags</span>
                <Input.Root size="sm">
                  <Input.Field
                    id={`${rule.id}-tags`}
                    defaultValue={rule.tags.join(", ")}
                    onBlur={(event) => {
                      void updateRule(rule.id, {
                        tags: event.currentTarget.value
                          .split(",")
                          .map((tag) => tag.trim())
                          .filter(Boolean),
                      });
                    }}
                  />
                </Input.Root>
              </label>
              <label
                className={styles.field}
                htmlFor={`${rule.id}-destination`}
              >
                <span>Destination</span>
                <Select.Root
                  items={folderOptions}
                  disabled={!foldersLoaded}
                  value={rule.folderId ?? ""}
                  onValueChange={(folderId) => {
                    void updateRule(rule.id, { folderId: folderId || null });
                  }}
                >
                  <Select.Trigger id={`${rule.id}-destination`} size="sm">
                    <Select.Value />
                  </Select.Trigger>
                  <Select.Portal>
                    <Select.Positioner sideOffset={6}>
                      <Select.Popup>
                        <Select.Items items={folderOptions} />
                      </Select.Popup>
                    </Select.Positioner>
                  </Select.Portal>
                </Select.Root>
              </label>
              <label className={styles.field} htmlFor={`${rule.id}-mode`}>
                <span>Source Files</span>
                <Select.Root
                  items={MODE_OPTIONS}
                  value={rule.mode}
                  onValueChange={(mode) => {
                    if (mode === "copy" || mode === "move")
                      void updateRule(rule.id, { mode });
                  }}
                >
                  <Select.Trigger id={`${rule.id}-mode`} size="sm">
                    <Select.Value />
                  </Select.Trigger>
                  <Select.Portal>
                    <Select.Positioner sideOffset={6}>
                      <Select.Popup>
                        <Select.Items items={MODE_OPTIONS} />
                      </Select.Popup>
                    </Select.Positioner>
                  </Select.Portal>
                </Select.Root>
              </label>
              <label className={styles.field} htmlFor={`${rule.id}-duplicates`}>
                <span>Duplicates</span>
                <Select.Root
                  items={DUPLICATE_OPTIONS}
                  value={rule.duplicatePolicy}
                  onValueChange={(duplicatePolicy) => {
                    if (
                      duplicatePolicy === "skip" ||
                      duplicatePolicy === "import"
                    )
                      void updateRule(rule.id, { duplicatePolicy });
                  }}
                >
                  <Select.Trigger id={`${rule.id}-duplicates`} size="sm">
                    <Select.Value />
                  </Select.Trigger>
                  <Select.Portal>
                    <Select.Positioner sideOffset={6}>
                      <Select.Popup>
                        <Select.Items items={DUPLICATE_OPTIONS} />
                      </Select.Popup>
                    </Select.Positioner>
                  </Select.Portal>
                </Select.Root>
              </label>
              <label
                className={styles.toggle}
                htmlFor={`${rule.id}-auto-select`}
              >
                <span>Select after import</span>
                <Switch.Root
                  id={`${rule.id}-auto-select`}
                  checked={rule.autoSelect}
                  onCheckedChange={(autoSelect) => {
                    void updateRule(rule.id, { autoSelect });
                  }}
                />
              </label>
              <label
                className={styles.toggle}
                htmlFor={`${rule.id}-notifications`}
              >
                <span>Notify after import</span>
                <Switch.Root
                  id={`${rule.id}-notifications`}
                  checked={rule.notifications}
                  onCheckedChange={(notifications) => {
                    void updateRule(rule.id, { notifications });
                  }}
                />
              </label>
            </Settings.CardContent>
          ) : null}
        </Settings.Card>
      ))}

      <Settings.Item>
        <Settings.ItemDetails>
          <Settings.ItemTitle>Screenshot Folders</Settings.ItemTitle>
          <Settings.ItemDescription>
            Pond imports new screenshots and recordings from each watched
            folder.
          </Settings.ItemDescription>
        </Settings.ItemDetails>
        <Settings.ItemControl>
          <Button
            size="sm"
            variant="secondary"
            disabled={!status}
            onClick={() => void addRule()}
          >
            Add Folder
          </Button>
        </Settings.ItemControl>
      </Settings.Item>

      {status && status.history.length > 0 ? (
        <Settings.Item>
          <Settings.ItemDetails>
            <Settings.ItemTitle>Recent Screenshot Imports</Settings.ItemTitle>
            <Settings.ItemDescription>
              {status.history
                .slice(0, 8)
                .map((entry) =>
                  entry.ok ? entry.name : `${entry.name} failed`,
                )
                .join(", ")}
            </Settings.ItemDescription>
          </Settings.ItemDetails>
        </Settings.Item>
      ) : null}
    </Settings.List>
  );
}
