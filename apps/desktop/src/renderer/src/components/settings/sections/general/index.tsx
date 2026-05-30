import { Button, Input, Select, Switch, useToast } from "@pond/ui";
import { useQuery } from "@tanstack/react-query";
import { ChevronsUpDown } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Settings } from "@/components/settings";
import { usePrefs } from "@/pool/prefs";
import styles from "./styles.module.css";

const REPO_URL = "https://github.com/raphaelsalaja/pond";

interface VideoToolsStatus {
  ytdlp: { available: boolean; path: string | null };
  ffmpeg: { available: boolean; path: string | null };
}

export function GeneralSection() {
  const toast = useToast();
  const [prefs, patch] = usePrefs("preferences");
  const [windowPrefs, patchWindow] = usePrefs("window");
  const [search, patchSearch] = usePrefs("search");
  const [notifications, patchNotifications] = usePrefs("notifications");
  const [updates, patchUpdates] = usePrefs("updates");
  const [developer, patchDeveloper] = usePrefs("developer");
  const [quick, patchQuick] = usePrefs("quickCapture");
  const [trash, patchTrash] = usePrefs("trash");
  const [apiPrefs] = usePrefs("api");
  const [checkBusy, setCheckBusy] = useState(false);
  const [busyApply, setBusyApply] = useState(false);
  const [reinstalling, setReinstalling] = useState(false);
  const [ingestToken, setIngestToken] = useState<string | null>(null);

  const { data: toolsStatus, refetch: refreshTools } =
    useQuery<VideoToolsStatus | null>({
      queryKey: ["videoTools", "status"],
      queryFn: async () => {
        const r = await window.pond.videoToolsStatus().catch(() => null);
        if (!r?.ok) return null;
        return { ytdlp: r.ytdlp, ffmpeg: r.ffmpeg };
      },
    });

  const reinstallTools = useCallback(async () => {
    setReinstalling(true);
    try {
      const r = await window.pond.videoToolsReinstall();
      toast.add({
        title: r.ok ? "yt-dlp ready" : "Couldn't install yt-dlp",
        description: r.message,
        type: r.ok ? "success" : "error",
      });
      await refreshTools();
    } finally {
      setReinstalling(false);
    }
  }, [refreshTools, toast]);

  useEffect(() => {
    void window.pond
      .query("settings.ingestToken", {})
      .then((t) => setIngestToken((t as { token?: string }).token ?? null));
  }, []);

  const pairingLink = useMemo(() => {
    if (!ingestToken) return "";
    const u = new URL("pond://pair");
    u.searchParams.set("port", String(apiPrefs.port || 41610));
    u.searchParams.set("token", ingestToken);
    return u.toString();
  }, [ingestToken, apiPrefs.port]);

  function copyPairingLink() {
    if (!pairingLink) return;
    void navigator.clipboard.writeText(pairingLink);
    toast.add({ title: "Pairing link copied", type: "success" });
  }

  function openRepo() {
    void window.pond.openExternal(REPO_URL);
  }

  const trashValue =
    trash.autoEmptyDays === null ? "never" : String(trash.autoEmptyDays);

  const applyWindowPrefs = useCallback(async () => {
    await window.pond.query("window.applyPrefs", {}).catch(() => {
      // Restore-position changes only matter at next launch; handlers may
      // be missing in older main processes (fail open).
    });
  }, []);

  const applyQuickPrefs = useCallback(async () => {
    setBusyApply(true);
    try {
      await window.pond.query("quickCapture.applyPrefs", {});
    } finally {
      setBusyApply(false);
    }
  }, []);

  const onQuickPatch = useCallback(
    (delta: Partial<typeof quick>) => {
      patchQuick(delta);
      setTimeout(() => void applyQuickPrefs(), 50);
    },
    [patchQuick, applyQuickPrefs],
  );

  const applyUpdatesPrefs = useCallback(async () => {
    await window.pond.query("updates.applyPrefs", {});
  }, []);

  const onUpdatesPatch = useCallback(
    (delta: Partial<typeof updates>) => {
      patchUpdates(delta);
      setTimeout(() => void applyUpdatesPrefs(), 50);
    },
    [patchUpdates, applyUpdatesPrefs],
  );

  async function checkNow() {
    setCheckBusy(true);
    try {
      const r = (await window.pond.query("updates.checkNow", {})) as
        | { ok: true; version?: string }
        | { ok: false; reason: string };
      if (!r.ok) {
        toast.add({
          title: "Update check failed",
          description:
            r.reason === "dev_build"
              ? "Dev builds don't check the update server. Run a release build."
              : r.reason,
          type: "warning",
        });
        return;
      }
      toast.add({
        title: r.version
          ? `Update available: ${r.version}`
          : "Pond is up to date",
        type: "success",
      });
    } finally {
      setCheckBusy(false);
    }
  }

  return (
    <Settings.Page>
      <Settings.Header>
        <Settings.Title>General</Settings.Title>
        <Settings.Description>
          Window behavior, input, search, notifications, and updates.
        </Settings.Description>
      </Settings.Header>

      <Settings.Section>
        <Settings.SectionTitle>Window</Settings.SectionTitle>
        <Settings.List>
          <Settings.Item>
            <Settings.ItemDetails>
              <Settings.ItemTitle>Close to Tray</Settings.ItemTitle>
              <Settings.ItemDescription>
                Hide Pond when you close the window instead of quitting.
              </Settings.ItemDescription>
            </Settings.ItemDetails>
            <Settings.ItemControl>
              <Switch.Root
                checked={windowPrefs.closeToTray}
                onCheckedChange={(v) => {
                  patchWindow({ closeToTray: v });
                  setTimeout(() => void applyWindowPrefs(), 50);
                }}
              />
            </Settings.ItemControl>
          </Settings.Item>

          <Settings.Item>
            <Settings.ItemDetails>
              <Settings.ItemTitle>Launch Hidden</Settings.ItemTitle>
              <Settings.ItemDescription>
                Start in the tray on login without opening a window.
              </Settings.ItemDescription>
            </Settings.ItemDetails>
            <Settings.ItemControl>
              <Switch.Root
                checked={windowPrefs.launchHidden}
                onCheckedChange={(v) => {
                  patchWindow({ launchHidden: v });
                  setTimeout(() => void applyWindowPrefs(), 50);
                }}
              />
            </Settings.ItemControl>
          </Settings.Item>

          <Settings.Item>
            <Settings.ItemDetails>
              <Settings.ItemTitle>Remember Window Position</Settings.ItemTitle>
              <Settings.ItemDescription>
                Restore the last window size and screen position on launch.
              </Settings.ItemDescription>
            </Settings.ItemDetails>
            <Settings.ItemControl>
              <Switch.Root
                checked={windowPrefs.restorePosition}
                onCheckedChange={(v) => patchWindow({ restorePosition: v })}
              />
            </Settings.ItemControl>
          </Settings.Item>
        </Settings.List>
      </Settings.Section>

      <Settings.Section>
        <Settings.SectionTitle>Menu Bar</Settings.SectionTitle>
        <Settings.List>
          <Settings.Item>
            <Settings.ItemDetails>
              <Settings.ItemTitle>Show Menu Bar Icon</Settings.ItemTitle>
              <Settings.ItemDescription>
                Keep Pond reachable from the system tray with the window hidden.
              </Settings.ItemDescription>
            </Settings.ItemDetails>
            <Settings.ItemControl>
              <Switch.Root
                checked={quick.menuBarIcon}
                onCheckedChange={(v) => onQuickPatch({ menuBarIcon: v })}
                disabled={busyApply}
              />
            </Settings.ItemControl>
          </Settings.Item>

          <Settings.Item>
            <Settings.ItemDetails>
              <Settings.ItemTitle>Launch at Login</Settings.ItemTitle>
              <Settings.ItemDescription>
                Start Pond when you sign in to your computer.
              </Settings.ItemDescription>
            </Settings.ItemDetails>
            <Settings.ItemControl>
              <Switch.Root
                checked={quick.launchAtLogin}
                onCheckedChange={(v) => onQuickPatch({ launchAtLogin: v })}
                disabled={busyApply}
              />
            </Settings.ItemControl>
          </Settings.Item>
        </Settings.List>
      </Settings.Section>

      <Settings.Section>
        <Settings.SectionTitle>Input</Settings.SectionTitle>
        <Settings.List>
          <Settings.Item>
            <Settings.ItemDetails>
              <Settings.ItemTitle>Use Pointer Cursors</Settings.ItemTitle>
              <Settings.ItemDescription>
                Show a hand cursor on hover instead of the default text caret.
              </Settings.ItemDescription>
            </Settings.ItemDetails>
            <Settings.ItemControl>
              <Switch.Root
                checked={prefs.pointerCursors}
                onCheckedChange={(v) => patch({ pointerCursors: v })}
              />
            </Settings.ItemControl>
          </Settings.Item>
        </Settings.List>
      </Settings.Section>

      <Settings.Section>
        <Settings.SectionTitle>Search</Settings.SectionTitle>
        <Settings.List>
          <Settings.Item>
            <Settings.ItemDetails>
              <Settings.ItemTitle>Max Search Results</Settings.ItemTitle>
              <Settings.ItemDescription>
                How many matches Pond returns per query. 50 to 1000.
              </Settings.ItemDescription>
            </Settings.ItemDetails>
            <Settings.ItemControl>
              <Input.Field
                data-size="sm"
                type="number"
                min={50}
                max={1000}
                value={String(search.resultLimit)}
                onChange={(e) =>
                  patchSearch({
                    resultLimit: clamp(Number(e.target.value) || 200, 50, 1000),
                  })
                }
                style={{ width: 96 }}
              />
            </Settings.ItemControl>
          </Settings.Item>
        </Settings.List>
      </Settings.Section>

      <Settings.Section>
        <Settings.SectionTitle>Notifications</Settings.SectionTitle>
        <Settings.List>
          <Settings.Item>
            <Settings.ItemDetails>
              <Settings.ItemTitle>Save Completed</Settings.ItemTitle>
              <Settings.ItemDescription>
                Notify when a save finishes ingesting.
              </Settings.ItemDescription>
            </Settings.ItemDetails>
            <Settings.ItemControl>
              <Switch.Root
                checked={notifications.saveComplete}
                onCheckedChange={(v) => patchNotifications({ saveComplete: v })}
              />
            </Settings.ItemControl>
          </Settings.Item>

          <Settings.Item>
            <Settings.ItemDetails>
              <Settings.ItemTitle>Chime on Toast</Settings.ItemTitle>
              <Settings.ItemDescription>
                {"Plays a short 880\u00A0Hz tick when a toast lands."}
              </Settings.ItemDescription>
            </Settings.ItemDetails>
            <Settings.ItemControl>
              <Switch.Root
                checked={notifications.sound}
                onCheckedChange={(v) => patchNotifications({ sound: v })}
              />
            </Settings.ItemControl>
          </Settings.Item>
        </Settings.List>
      </Settings.Section>

      <Settings.Section>
        <Settings.SectionTitle>Updates</Settings.SectionTitle>
        <Settings.List>
          <Settings.Item>
            <Settings.ItemDetails>
              <Settings.ItemTitle>Channel</Settings.ItemTitle>
              <Settings.ItemDescription>
                Stable ships every few weeks. Beta gets fixes sooner.
              </Settings.ItemDescription>
            </Settings.ItemDetails>
            <Settings.ItemControl>
              <Select.Root
                value={updates.channel}
                onValueChange={(v) =>
                  onUpdatesPatch({ channel: v as "stable" | "beta" })
                }
              >
                <Select.Trigger>
                  <Select.Value />
                  <Select.Icon>
                    <ChevronsUpDown />
                  </Select.Icon>
                </Select.Trigger>
                <Select.Portal>
                  <Select.Positioner sideOffset={6}>
                    <Select.Popup>
                      <Select.Item value="stable">Stable</Select.Item>
                      <Select.Item value="beta">Beta</Select.Item>
                    </Select.Popup>
                  </Select.Positioner>
                </Select.Portal>
              </Select.Root>
            </Settings.ItemControl>
          </Settings.Item>

          <Settings.Item>
            <Settings.ItemDetails>
              <Settings.ItemTitle>Auto-Install Updates</Settings.ItemTitle>
              <Settings.ItemDescription>
                Download updates as they appear. Apply on next launch.
              </Settings.ItemDescription>
            </Settings.ItemDetails>
            <Settings.ItemControl>
              <Switch.Root
                checked={updates.autoInstall}
                onCheckedChange={(v) => onUpdatesPatch({ autoInstall: v })}
              />
            </Settings.ItemControl>
          </Settings.Item>

          <Settings.Item>
            <Settings.ItemDetails>
              <Settings.ItemTitle>Check for Updates</Settings.ItemTitle>
              <Settings.ItemDescription>
                Ping the update server for a newer build.
              </Settings.ItemDescription>
            </Settings.ItemDetails>
            <Settings.ItemControl>
              <Button
                size="sm"
                onClick={() => void checkNow()}
                disabled={checkBusy}
              >
                {checkBusy ? "Checking…" : "Check Now"}
              </Button>
            </Settings.ItemControl>
          </Settings.Item>
        </Settings.List>
      </Settings.Section>

      <Settings.Section>
        <Settings.SectionTitle>Extension</Settings.SectionTitle>
        <Settings.List>
          <Settings.Item>
            <Settings.ItemDetails>
              <Settings.ItemTitle>Pairing Link</Settings.ItemTitle>
              <Settings.ItemDescription>
                Copy this and paste it into the Pond extension to pair.
              </Settings.ItemDescription>
            </Settings.ItemDetails>
            <Settings.ItemControl>
              <Button
                size="sm"
                disabled={!pairingLink}
                onClick={copyPairingLink}
              >
                Copy Link
              </Button>
            </Settings.ItemControl>
          </Settings.Item>

          <Settings.Item>
            <Settings.ItemDetails>
              <Settings.ItemTitle>Install Instructions</Settings.ItemTitle>
              <Settings.ItemDescription>
                Build from source.
              </Settings.ItemDescription>
            </Settings.ItemDetails>
            <Settings.ItemControl>
              <Button size="sm" onClick={openRepo}>
                Open Repo
              </Button>
            </Settings.ItemControl>
          </Settings.Item>
        </Settings.List>
      </Settings.Section>

      <Settings.Section>
        <Settings.SectionTitle>Trash</Settings.SectionTitle>
        <Settings.List>
          <Settings.Item>
            <Settings.ItemDetails>
              <Settings.ItemTitle>Auto-Empty Trash</Settings.ItemTitle>
              <Settings.ItemDescription>
                Permanently delete saves older than this window.
              </Settings.ItemDescription>
            </Settings.ItemDetails>
            <Settings.ItemControl>
              <Select.Root
                value={trashValue}
                onValueChange={(v) =>
                  patchTrash({
                    autoEmptyDays: v === "never" ? null : Number(v),
                  })
                }
              >
                <Select.Trigger>
                  <Select.Value />
                  <Select.Icon>
                    <ChevronsUpDown />
                  </Select.Icon>
                </Select.Trigger>
                <Select.Portal>
                  <Select.Positioner sideOffset={6}>
                    <Select.Popup>
                      <Select.Item value="never">Never</Select.Item>
                      <Select.Item value="7">{"After 7\u00A0days"}</Select.Item>
                      <Select.Item value="30">
                        {"After 30\u00A0days"}
                      </Select.Item>
                      <Select.Item value="90">
                        {"After 90\u00A0days"}
                      </Select.Item>
                    </Select.Popup>
                  </Select.Positioner>
                </Select.Portal>
              </Select.Root>
            </Settings.ItemControl>
          </Settings.Item>

          <Settings.Item>
            <Settings.ItemDetails>
              <Settings.ItemTitle>Confirm Before Emptying</Settings.ItemTitle>
              <Settings.ItemDescription>
                Ask before Empty Trash deletes everything.
              </Settings.ItemDescription>
            </Settings.ItemDetails>
            <Settings.ItemControl>
              <Switch.Root
                checked={trash.confirmBeforeEmpty}
                onCheckedChange={(v) => patchTrash({ confirmBeforeEmpty: v })}
              />
            </Settings.ItemControl>
          </Settings.Item>
        </Settings.List>
      </Settings.Section>

      <Settings.Section>
        <Settings.SectionTitle>Dependencies</Settings.SectionTitle>
        <Settings.List>
          <Settings.Item>
            <Settings.ItemDetails>
              <Settings.ItemTitle>yt-dlp</Settings.ItemTitle>
              <Settings.ItemDescription>
                {toolsStatus ? (
                  <span
                    className={
                      toolsStatus.ytdlp.available
                        ? styles["status-installed"]
                        : styles["status-missing"]
                    }
                  >
                    {toolsStatus.ytdlp.available ? "Installed" : "Missing"}
                  </span>
                ) : (
                  "Checking…"
                )}
              </Settings.ItemDescription>
            </Settings.ItemDetails>
            <Settings.ItemControl>
              <Button
                size="sm"
                disabled={reinstalling || !toolsStatus}
                onClick={() => void reinstallTools()}
              >
                {reinstalling
                  ? "Installing…"
                  : toolsStatus?.ytdlp.available
                    ? "Reinstall"
                    : "Install"}
              </Button>
            </Settings.ItemControl>
          </Settings.Item>

          <Settings.Item>
            <Settings.ItemDetails>
              <Settings.ItemTitle>ffmpeg</Settings.ItemTitle>
              <Settings.ItemDescription>
                {toolsStatus ? (
                  <span
                    className={
                      toolsStatus.ffmpeg.available
                        ? styles["status-installed"]
                        : styles["status-missing"]
                    }
                  >
                    {toolsStatus.ffmpeg.available ? "Installed" : "Missing"}
                  </span>
                ) : (
                  "Checking…"
                )}
              </Settings.ItemDescription>
            </Settings.ItemDetails>
          </Settings.Item>
        </Settings.List>
      </Settings.Section>

      <Settings.Section>
        <Settings.SectionTitle>Advanced</Settings.SectionTitle>
        <Settings.List>
          <Settings.Item>
            <Settings.ItemDetails>
              <Settings.ItemTitle>Show Developer Tools</Settings.ItemTitle>
              <Settings.ItemDescription>
                Enable developer tools in the sidebar.
              </Settings.ItemDescription>
            </Settings.ItemDetails>
            <Settings.ItemControl>
              <Switch.Root
                checked={developer.developerMode}
                onCheckedChange={(v) => patchDeveloper({ developerMode: v })}
              />
            </Settings.ItemControl>
          </Settings.Item>
        </Settings.List>
      </Settings.Section>
    </Settings.Page>
  );
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, Math.floor(value)));
}
