import { Button, Input, Settings, useToast } from "@pond/ui";
import { useCallback, useEffect, useState } from "react";
import { usePrefs } from "@/core/data/prefs";
import {
  type BindAddress,
  BindAddressSelect,
} from "@/features/settings/bind-address";

// Local API server config (port, bind address, token, CORS allow-list); owns all `api` prefs state.
export function DeveloperApiSection() {
  const toast = useToast();
  const [apiPrefs, patchApi] = usePrefs("api");
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

  return (
    <>
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
              <BindAddressSelect
                value={apiPrefs.bindAddress as BindAddress}
                onValueChange={(v) => patchApi({ bindAddress: v })}
              />
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
    </>
  );
}
