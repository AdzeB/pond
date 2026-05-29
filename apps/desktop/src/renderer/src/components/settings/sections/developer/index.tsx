import { AlertDialog, Button, Input, Select, Switch, useToast } from "@pond/ui";
import { Link } from "@tanstack/react-router";
import { ChevronsUpDown } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Settings } from "@/components/settings";
import { reloadPrefs, usePrefs } from "@/pool/prefs";

export function DeveloperSection() {
  const toast = useToast();
  const [prefs, patch] = usePrefs("developer");
  const [apiPrefs, patchApi] = usePrefs("api");
  const [resetBusy, setResetBusy] = useState<string | null>(null);
  const [confirmFactory, setConfirmFactory] = useState(false);
  const [apiBusy, setApiBusy] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");

  const loadToken = useCallback(async () => {
    const r = (await window.pond.query("settings.ingestToken", {})) as {
      token?: string | null;
    };
    setToken(r?.token ?? null);
  }, []);

  useEffect(() => {
    void loadToken();
  }, [loadToken]);

  async function applyServer() {
    setApiBusy(true);
    try {
      const r = (await window.pond.query("api.restart", {})) as
        | { ok: true; port: number; host: string }
        | { ok: false; reason: string };
      if (!r.ok) {
        toast.add({
          title: "Couldn't restart API",
          description: r.reason,
          type: "error",
        });
        return;
      }
      toast.add({
        title: "API restarted",
        description: `Listening on http://${r.host}:${r.port}/api/v2/.`,
        type: "success",
      });
    } finally {
      setApiBusy(false);
    }
  }

  async function rotateToken() {
    await window.pond.query("settings.rotateIngestToken", {});
    await loadToken();
    toast.add({ title: "Ingest token rotated", type: "success" });
  }

  function copy(text: string, label: string) {
    if (!text) return;
    void navigator.clipboard.writeText(text);
    toast.add({ title: `${label} copied`, type: "success" });
  }

  function addOrigin() {
    const v = origin.trim();
    if (!v) return;
    if (apiPrefs.allowedOrigins.includes(v)) {
      setOrigin("");
      return;
    }
    patchApi({ allowedOrigins: [...apiPrefs.allowedOrigins, v] });
    setOrigin("");
  }

  function removeOrigin(value: string) {
    patchApi({
      allowedOrigins: apiPrefs.allowedOrigins.filter((x) => x !== value),
    });
  }

  const apply = useCallback(
    async (next: boolean) => {
      patch({ verboseLogging: next });
      await window.pond.query("developer.applyVerboseLogging", {
        verbose: next,
      });
    },
    [patch],
  );

  async function openLogs() {
    await window.pond.query("developer.openLogs", {});
  }

  async function openInspector() {
    const r = (await window.pond.query("developer.openIpcInspector", {})) as {
      ok: boolean;
      reason?: string;
    };
    if (!r.ok && r.reason) {
      toast.add({
        title: "Inspector failed",
        description: r.reason,
        type: "error",
      });
    }
  }

  async function clearVideoCache() {
    setResetBusy("video");
    try {
      const r = (await window.pond.query("reset.clearVideoCache", {})) as {
        ok: boolean;
        removed: number;
      };
      toast.add({
        title: "Video cache cleared",
        description: `${r.removed}\u00A0files removed.`,
        type: "success",
      });
    } finally {
      setResetBusy(null);
    }
  }

  async function clearThumbnails() {
    setResetBusy("thumbs");
    try {
      const r = (await window.pond.query("reset.clearThumbnails", {})) as {
        ok: boolean;
        removed: number;
      };
      toast.add({
        title: "Thumbnails cleared",
        description: `${r.removed}\u00A0files removed.`,
        type: "success",
      });
    } finally {
      setResetBusy(null);
    }
  }

  async function resetPreferences() {
    setResetBusy("prefs");
    try {
      await window.pond.query("reset.preferences", {});
      await reloadPrefs();
      toast.add({ title: "Preferences reset to defaults", type: "success" });
    } finally {
      setResetBusy(null);
    }
  }

  async function factoryReset() {
    setResetBusy("factory");
    try {
      await window.pond.query("reset.factory", {});
      toast.add({
        title: "Pond will relaunch",
        description:
          "Index wiped. Restart Pond to rebuild from your library files.",
        type: "warning",
      });
    } finally {
      setResetBusy(null);
      setConfirmFactory(false);
    }
  }

  return (
    <Settings.Page>
      <Settings.Header>
        <Settings.Title>Developer</Settings.Title>
        <Settings.Description>
          Logs, inspector, cache resets, and the factory wipe.
        </Settings.Description>
      </Settings.Header>

      <Settings.Section>
        <Settings.SectionTitle>Diagnostics</Settings.SectionTitle>
        <Settings.List>
          <Settings.Item>
            <Settings.ItemDetails>
              <Settings.ItemTitle>Open Log Directory</Settings.ItemTitle>
              <Settings.ItemDescription>
                Reveal electron-log files in your file manager.
              </Settings.ItemDescription>
            </Settings.ItemDetails>
            <Settings.ItemControl>
              <Button size="sm" onClick={() => void openLogs()}>
                Reveal
              </Button>
            </Settings.ItemControl>
          </Settings.Item>

          <Settings.Item>
            <Settings.ItemDetails>
              <Settings.ItemTitle>Verbose Logging</Settings.ItemTitle>
              <Settings.ItemDescription>
                Capture every IPC and executor call. Slows Pond down.
              </Settings.ItemDescription>
            </Settings.ItemDetails>
            <Settings.ItemControl>
              <Switch.Root
                checked={prefs.verboseLogging}
                onCheckedChange={(v) => void apply(v)}
              />
            </Settings.ItemControl>
          </Settings.Item>

          <Settings.Item>
            <Settings.ItemDetails>
              <Settings.ItemTitle>Open IPC Inspector</Settings.ItemTitle>
              <Settings.ItemDescription>
                Read-only view of recent IPC traffic.
              </Settings.ItemDescription>
            </Settings.ItemDetails>
            <Settings.ItemControl>
              <Button size="sm" onClick={() => void openInspector()}>
                Open Inspector
              </Button>
            </Settings.ItemControl>
          </Settings.Item>

          <Settings.Item>
            <Settings.ItemDetails>
              <Settings.ItemTitle>Activity</Settings.ItemTitle>
              <Settings.ItemDescription>
                Query the pipeline event stream: one row per task, sync, and
                save lifecycle. Filter by source, outcome, or error.
              </Settings.ItemDescription>
            </Settings.ItemDetails>
            <Settings.ItemControl>
              <Link to="/sync">
                <Button size="sm">Open Sync</Button>
              </Link>
            </Settings.ItemControl>
          </Settings.Item>
        </Settings.List>
      </Settings.Section>

      <Settings.Section>
        <Settings.SectionTitle>Caches</Settings.SectionTitle>
        <Settings.List>
          <Settings.Item>
            <Settings.ItemDetails>
              <Settings.ItemTitle>Clear Video Cache</Settings.ItemTitle>
              <Settings.ItemDescription>
                Delete every cached MP4 under <code>_video_cache/</code>.
              </Settings.ItemDescription>
            </Settings.ItemDetails>
            <Settings.ItemControl>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => void clearVideoCache()}
                disabled={resetBusy === "video"}
              >
                {resetBusy === "video" ? "Clearing…" : "Clear Cache"}
              </Button>
            </Settings.ItemControl>
          </Settings.Item>

          <Settings.Item>
            <Settings.ItemDetails>
              <Settings.ItemTitle>Clear Thumbnails</Settings.ItemTitle>
              <Settings.ItemDescription>
                Delete every cached preview tile under <code>_thumbs/</code>.
              </Settings.ItemDescription>
            </Settings.ItemDetails>
            <Settings.ItemControl>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => void clearThumbnails()}
                disabled={resetBusy === "thumbs"}
              >
                {resetBusy === "thumbs" ? "Clearing…" : "Clear Thumbnails"}
              </Button>
            </Settings.ItemControl>
          </Settings.Item>
        </Settings.List>
      </Settings.Section>

      <Settings.Section>
        <Settings.SectionTitle>Local API Server</Settings.SectionTitle>
        <Settings.List>
          <Settings.Item>
            <Settings.ItemDetails>
              <Settings.ItemTitle>Port</Settings.ItemTitle>
              <Settings.ItemDescription>
                The TCP port the API listens on. Applied on restart.
              </Settings.ItemDescription>
            </Settings.ItemDetails>
            <Settings.ItemControl>
              <Input.Field
                data-size="sm"
                type="number"
                value={String(apiPrefs.port)}
                onChange={(e) =>
                  patchApi({
                    port: Math.max(
                      1,
                      Math.min(65535, Number(e.target.value) || 41610),
                    ),
                  })
                }
                style={{ width: 96 }}
              />
            </Settings.ItemControl>
          </Settings.Item>

          <Settings.Item>
            <Settings.ItemDetails>
              <Settings.ItemTitle>Bind Address</Settings.ItemTitle>
              <Settings.ItemDescription>
                Loopback stays local; LAN exposes the server to your network.
              </Settings.ItemDescription>
            </Settings.ItemDetails>
            <Settings.ItemControl>
              <Select.Root
                value={apiPrefs.bindAddress}
                onValueChange={(v) =>
                  patchApi({ bindAddress: v as "loopback" | "lan" })
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
                      <Select.Item value="loopback">
                        Loopback (127.0.0.1)
                      </Select.Item>
                      <Select.Item value="lan">LAN (0.0.0.0)</Select.Item>
                    </Select.Popup>
                  </Select.Positioner>
                </Select.Portal>
              </Select.Root>
            </Settings.ItemControl>
          </Settings.Item>

          <Settings.Item>
            <Settings.ItemDetails>
              <Settings.ItemTitle>Apply</Settings.ItemTitle>
              <Settings.ItemDescription>
                Restart the server with the current port and bind address.
              </Settings.ItemDescription>
            </Settings.ItemDetails>
            <Settings.ItemControl>
              <Button size="sm" onClick={applyServer} disabled={apiBusy}>
                {apiBusy ? "Restarting…" : "Restart Server"}
              </Button>
            </Settings.ItemControl>
          </Settings.Item>

          <Settings.Item>
            <Settings.ItemDetails>
              <Settings.ItemTitle>Ingest Token</Settings.ItemTitle>
              <Settings.ItemDescription>
                {token
                  ? "Bearer token presented by every API request."
                  : "No token set yet."}
              </Settings.ItemDescription>
            </Settings.ItemDetails>
            <Settings.ItemControl>
              <div style={{ display: "flex", gap: 6 }}>
                <Button
                  size="sm"
                  onClick={() => copy(token ?? "", "Token")}
                  disabled={!token}
                >
                  Copy
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => void rotateToken()}
                >
                  Rotate
                </Button>
              </div>
            </Settings.ItemControl>
          </Settings.Item>
        </Settings.List>
      </Settings.Section>

      <Settings.Section>
        <Settings.SectionTitle>CORS Allow-List</Settings.SectionTitle>
        <Settings.ItemDetails>
          <Settings.ItemTitle>Additional Origins</Settings.ItemTitle>
          <Settings.ItemDescription>
            Extra origins allowed beyond extensions and localhost.
          </Settings.ItemDescription>
        </Settings.ItemDetails>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {apiPrefs.allowedOrigins.map((o) => (
            <span
              key={o}
              style={{
                padding: "2px 8px",
                borderRadius: 999,
                fontSize: 12,
                background: "var(--ds-gray-2)",
                border: "1px solid var(--ds-gray-a4)",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              {o}
              <button
                type="button"
                aria-label={`Remove ${o}`}
                onClick={() => removeOrigin(o)}
                style={{
                  border: "none",
                  background: "transparent",
                  color: "var(--ds-gray-11)",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                ×
              </button>
            </span>
          ))}
          <Input.Field
            data-size="sm"
            placeholder="https://example.com"
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addOrigin();
              }
            }}
            style={{ flex: 1, minWidth: 200 }}
          />
          <Button size="sm" onClick={addOrigin}>
            Add
          </Button>
        </div>
      </Settings.Section>

      <Settings.Section>
        <Settings.SectionTitle>Reset Preferences</Settings.SectionTitle>
        <Settings.List>
          <Settings.Item>
            <Settings.ItemDetails>
              <Settings.ItemTitle>Reset Preferences</Settings.ItemTitle>
              <Settings.ItemDescription>
                Restore every Settings knob to its default.
              </Settings.ItemDescription>
            </Settings.ItemDetails>
            <Settings.ItemControl>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => void resetPreferences()}
                disabled={resetBusy === "prefs"}
              >
                {resetBusy === "prefs" ? "Resetting…" : "Reset"}
              </Button>
            </Settings.ItemControl>
          </Settings.Item>
        </Settings.List>
      </Settings.Section>

      <Settings.Section>
        <Settings.SectionTitle>Danger Zone</Settings.SectionTitle>
        <Settings.List>
          <Settings.Item>
            <Settings.ItemDetails>
              <Settings.ItemTitle>Factory Reset</Settings.ItemTitle>
              <Settings.ItemDescription>
                Drop the SQLite index. Rebuilds from metadata on next launch.
              </Settings.ItemDescription>
            </Settings.ItemDetails>
            <Settings.ItemControl>
              <AlertDialog.Root
                open={confirmFactory}
                onOpenChange={setConfirmFactory}
              >
                <AlertDialog.Trigger
                  render={<Button variant="danger">Factory Reset…</Button>}
                />
                <AlertDialog.Portal>
                  <AlertDialog.Backdrop />
                  <AlertDialog.Popup>
                    <AlertDialog.Title>Factory Reset?</AlertDialog.Title>
                    <AlertDialog.Description>
                      This wipes the SQLite index and prefs. Saves on disk stay
                      put. You'll see onboarding on next launch.
                    </AlertDialog.Description>
                    <AlertDialog.Actions>
                      <AlertDialog.Close
                        render={<Button variant="ghost">Cancel</Button>}
                      />
                      <AlertDialog.Close
                        render={
                          <Button
                            variant="danger"
                            disabled={resetBusy === "factory"}
                            onClick={(e) => {
                              e.preventDefault();
                              void factoryReset();
                            }}
                          >
                            {resetBusy === "factory"
                              ? "Resetting…"
                              : "Wipe & Restart"}
                          </Button>
                        }
                      />
                    </AlertDialog.Actions>
                  </AlertDialog.Popup>
                </AlertDialog.Portal>
              </AlertDialog.Root>
            </Settings.ItemControl>
          </Settings.Item>
        </Settings.List>
      </Settings.Section>
    </Settings.Page>
  );
}
