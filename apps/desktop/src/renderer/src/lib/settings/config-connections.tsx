import { Button, Input, Settings } from "@pond/ui";
import { useCallback, useEffect, useState } from "react";
import {
  type BindAddress,
  BindAddressSelect,
} from "@/components/settings/bind-address";
import { type Binding, defineSection } from "@/lib/settings/engine-types";

interface ApiValues {
  port?: number;
  bindAddress?: string;
  allowedOrigins?: string[];
}

function PortRow({ binding }: { binding: Binding }) {
  const values = binding.values as ApiValues;
  return (
    <>
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
          value={String(values.port ?? 41610)}
          onChange={(e) =>
            binding.patch({
              port: Math.max(
                1,
                Math.min(65535, Number(e.target.value) || 41610),
              ),
            })
          }
          style={{ width: 96 }}
        />
      </Settings.ItemControl>
    </>
  );
}

function BindAddressRow({ binding }: { binding: Binding }) {
  const values = binding.values as ApiValues;
  return (
    <>
      <Settings.ItemDetails>
        <Settings.ItemTitle>Bind Address</Settings.ItemTitle>
        <Settings.ItemDescription>
          Loopback stays local; LAN exposes the server to your network.
        </Settings.ItemDescription>
      </Settings.ItemDetails>
      <Settings.ItemControl>
        <BindAddressSelect
          value={values.bindAddress as BindAddress}
          onValueChange={(v) => binding.patch({ bindAddress: v })}
        />
      </Settings.ItemControl>
    </>
  );
}

function ApplyRow() {
  const [apiBusy, setApiBusy] = useState(false);
  const applyServer = useCallback(async () => {
    setApiBusy(true);
    try {
      await window.pond.query("api.restart", {});
    } finally {
      setApiBusy(false);
    }
  }, []);
  return (
    <>
      <Settings.ItemDetails>
        <Settings.ItemTitle>Apply</Settings.ItemTitle>
        <Settings.ItemDescription>
          Restart the server with the current port and bind address.
        </Settings.ItemDescription>
      </Settings.ItemDetails>
      <Settings.ItemControl>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => void applyServer()}
          disabled={apiBusy}
        >
          {apiBusy ? "Restarting" : "Restart Server"}
        </Button>
      </Settings.ItemControl>
    </>
  );
}

function IngestTokenRow() {
  const [token, setToken] = useState<string | null>(null);

  const loadToken = useCallback(async () => {
    const r = (await window.pond.query("settings.ingestToken", {})) as {
      token?: string | null;
    };
    setToken(r?.token ?? null);
  }, []);

  useEffect(() => {
    void loadToken();
  }, [loadToken]);

  async function rotateToken() {
    await window.pond.query("settings.rotateIngestToken", {});
    await loadToken();
  }

  function copy(text: string) {
    if (!text) return;
    void navigator.clipboard.writeText(text);
  }

  return (
    <>
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
            variant="secondary"
            onClick={() => copy(token ?? "")}
            disabled={!token}
          >
            Copy
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => void rotateToken()}
          >
            Rotate
          </Button>
        </div>
      </Settings.ItemControl>
    </>
  );
}

function CorsAllowList({ binding }: { binding: Binding }) {
  const values = binding.values as ApiValues;
  const allowedOrigins = values.allowedOrigins ?? [];
  const [origin, setOrigin] = useState("");

  function addOrigin() {
    const v = origin.trim();
    if (!v) return;
    if (allowedOrigins.includes(v)) {
      setOrigin("");
      return;
    }
    binding.patch({ allowedOrigins: [...allowedOrigins, v] });
    setOrigin("");
  }

  function removeOrigin(value: string) {
    binding.patch({
      allowedOrigins: allowedOrigins.filter((x) => x !== value),
    });
  }

  return (
    <>
      <Settings.ItemDetails>
        <Settings.ItemTitle>Additional Origins</Settings.ItemTitle>
        <Settings.ItemDescription>
          Extra origins allowed beyond extensions and localhost.
        </Settings.ItemDescription>
      </Settings.ItemDetails>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {allowedOrigins.length === 0 ? (
          <span
            style={{
              flexBasis: "100%",
              fontSize: 13,
              color: "var(--ds-gray-10)",
            }}
          >
            No additional origins yet.
          </span>
        ) : null}
        {allowedOrigins.map((o) => (
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
        <Button size="sm" variant="secondary" onClick={addOrigin}>
          Add
        </Button>
      </div>
    </>
  );
}

export const connectionsSection = defineSection("api", {
  title: "Connections",
  description: "The local API server and the origins allowed to reach it.",
  groups: [
    {
      title: "Local API Server",
      items: [
        {
          control: "custom",
          key: "port",
          title: "Port",
          keywords: ["tcp", "listen", "server"],
          render: (binding) => <PortRow binding={binding} />,
        },
        {
          control: "custom",
          key: "bindAddress",
          title: "Bind Address",
          keywords: ["loopback", "lan", "network", "host"],
          render: (binding) => <BindAddressRow binding={binding} />,
        },
        {
          control: "custom",
          key: "apply",
          title: "Apply",
          keywords: ["restart", "server", "reload"],
          render: () => <ApplyRow />,
        },
        {
          control: "custom",
          key: "ingest-token",
          title: "Ingest Token",
          keywords: ["bearer", "auth", "api key", "rotate"],
          render: () => <IngestTokenRow />,
        },
      ],
    },
    {
      title: "CORS Allow-List",
      items: [
        {
          control: "custom",
          key: "allowedOrigins",
          title: "Additional Origins",
          keywords: ["cors", "origins", "allow-list", "extensions"],
          render: (binding) => <CorsAllowList binding={binding} />,
        },
      ],
    },
  ],
});
