import {
  IconCodeOutline12 as Code,
  IconCircleInfoOutline12 as Info,
} from "@pond/icons/outline/12";
import { Button, Popover, Settings, Switch } from "@pond/ui";
import {
  hostSetupCommands,
  isMcpDeeplinkHost,
  MCP_HOST_CATALOG,
  type McpHostDefinition,
  type McpHostId,
} from "@shared/mcp-hosts";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import vscode from "@/assets/logos/agents/vscode.svg";
import anthropic from "@/assets/logos/providers/anthropic.webp";
import google from "@/assets/logos/providers/google.webp";
import openai from "@/assets/logos/providers/openai.webp";
import { usePrefs } from "@/features/settings/state/prefs";
import { useScrollFade } from "@/shared/hooks/use-scroll-fade";
import styles from "./styles.module.css";

const McpSnippetSchema = z.object({
  command: z.string().min(1),
  args: z.array(z.string()),
  json: z.string().min(1),
});

type PondSnippet = z.infer<typeof McpSnippetSchema>;

const HOST_LOGOS = {
  "claude-code": anthropic,
  "claude-desktop": anthropic,
  codex: openai,
  "gemini-cli": google,
  vscode,
} satisfies Partial<Record<McpHostId, string>>;

const ACCESS = [
  {
    key: "mcpSearch",
    title: "Search Saves",
    description: "Query, search, read, and list folders",
  },
  {
    key: "mcpOpen",
    title: "Open in Pond",
    description: "Reveal a save in the Pond window",
  },
  {
    key: "mcpExport",
    title: "Export Files",
    description: "Convert copies. Originals stay in the library.",
  },
] as const;

export function McpSection() {
  const snippet = useQuery({
    queryKey: ["mcp-snippet"],
    queryFn: async () =>
      McpSnippetSchema.parse(await window.pond.query("agent.mcpSnippet", {})),
    retry: false,
  });
  return (
    <Settings.Page>
      <Settings.Header>
        <Settings.HeaderText>
          <Settings.Title>Model Context Protocol</Settings.Title>
          <Settings.Description>
            Let Cursor and Claude search this library over stdio on this Mac.
          </Settings.Description>
        </Settings.HeaderText>
      </Settings.Header>
      <AccessSection />
      <AgentsSection snippet={snippet.data} />
    </Settings.Page>
  );
}

function AccessSection() {
  const [agent, patch] = usePrefs("agent");
  return (
    <Settings.Section>
      <Settings.SectionTitle>Access</Settings.SectionTitle>
      <Settings.List>
        {ACCESS.map((item) => (
          <Settings.Item key={item.key}>
            <Settings.ItemDetails>
              <Settings.ItemTitle>{item.title}</Settings.ItemTitle>
              <Settings.ItemDescription>
                {item.description}
              </Settings.ItemDescription>
            </Settings.ItemDetails>
            <Settings.ItemControl>
              <Switch.Root
                aria-label={item.title}
                checked={agent[item.key]}
                onCheckedChange={(checked) => {
                  void patch({ [item.key]: checked });
                }}
              />
            </Settings.ItemControl>
          </Settings.Item>
        ))}
      </Settings.List>
    </Settings.Section>
  );
}

function AgentsSection({ snippet }: { snippet?: PondSnippet }) {
  return (
    <Settings.Section>
      <Settings.SectionTitle>Agents</Settings.SectionTitle>
      <Settings.List>
        {MCP_HOST_CATALOG.map((host) => (
          <HostRow key={host.id} host={host} snippet={snippet} />
        ))}
      </Settings.List>
      <p className={styles.note}>
        Agents run on this Mac and read the library over stdio.
      </p>
    </Settings.Section>
  );
}

function HostRow({
  host,
  snippet,
}: {
  host: McpHostDefinition;
  snippet?: PondSnippet;
}) {
  return (
    <Settings.Item>
      <HostLogo id={host.id} />
      <Settings.ItemDetails>
        <Settings.ItemTitle>{host.name}</Settings.ItemTitle>
      </Settings.ItemDetails>
      <Settings.ItemControl>
        <HostPopover host={host} snippet={snippet} />
      </Settings.ItemControl>
    </Settings.Item>
  );
}

function HostLogo({ id }: { id: McpHostId }) {
  const src = Object.entries(HOST_LOGOS).find(([hostId]) => hostId === id)?.[1];
  if (src) {
    return (
      <img
        src={src}
        alt=""
        width={20}
        height={20}
        className={id === "vscode" ? styles.brandLogo : styles.logo}
      />
    );
  }
  return (
    <span className={styles.mark} aria-hidden>
      <Code />
    </span>
  );
}

function HostPopover({
  host,
  snippet,
}: {
  host: McpHostDefinition;
  snippet?: PondSnippet;
}) {
  const [error, setError] = useState("");
  const commands = snippet
    ? hostSetupCommands(host.id, snippet.command, snippet.args)
    : [];
  const json = snippet?.json ?? "";
  const deeplink = isMcpDeeplinkHost(host.id) ? host.id : null;

  async function addToClient() {
    if (!deeplink) return;
    setError("");
    const result = await window.pond.query("agent.openMcpInstall", {
      id: deeplink,
    });
    if (!result.ok) {
      setError(
        result.error ??
          "Pond could not open that install link. Copy the config instead.",
      );
    }
  }

  return (
    <Popover.Root>
      <Popover.Trigger
        render={<Button icon size="xs" variant="ghost" />}
        aria-label={`Set up ${host.name}`}
      >
        <Info />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner side="left" align="start" sideOffset={8}>
          <Popover.Popup className={styles.popup}>
            <Popover.Title className={styles.title}>{host.name}</Popover.Title>
            <p className={styles.lead}>The agent can search and read saves.</p>
            {deeplink ? (
              <Button size="sm" onClick={() => void addToClient()}>
                {host.addLabel}
              </Button>
            ) : null}
            {commands.map((command) => (
              <CopyLine
                key={command.label}
                label={command.label}
                value={command.value}
              />
            ))}
            {commands.length === 0 ? (
              <>
                <p className={styles.merge}>
                  {deeplink
                    ? `Or merge into ${host.configPath}:`
                    : `Merge into ${host.configPath}:`}
                </p>
                <JsonBlock json={json} />
              </>
            ) : null}
            <p className={styles.lead}>{host.hint}</p>
            {error ? (
              <p className={styles.error} role="alert">
                {error}
              </p>
            ) : null}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

function CopyLine({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const [copying, setCopying] = useState(false);
  return (
    <div className={styles.step}>
      <p className={styles.merge}>{label}</p>
      <div className={styles.command}>
        <code className={styles.value}>{value}</code>
        <Button
          size="xs"
          variant="ghost"
          disabled={!value || copying}
          onClick={() => {
            void (async () => {
              setCopying(true);
              setCopied(false);
              try {
                const result = await window.pond.query("clipboard.writeText", {
                  text: value,
                });
                if (!result.ok) throw new Error("Clipboard write failed");
                setCopied(true);
              } finally {
                setCopying(false);
              }
            })();
          }}
        >
          {copying ? "Copying" : copied ? "Copied" : "Copy"}
        </Button>
      </div>
    </div>
  );
}

function JsonBlock({ json }: { json: string }) {
  const [copied, setCopied] = useState(false);
  const [copying, setCopying] = useState(false);
  const scrollFade = useScrollFade<HTMLPreElement>();
  return (
    <>
      <pre className={styles.code} {...scrollFade}>
        <code>{json}</code>
      </pre>
      <Button
        size="sm"
        variant="secondary"
        disabled={!json || copying}
        onClick={() => {
          void (async () => {
            setCopying(true);
            setCopied(false);
            try {
              const result = await window.pond.query("clipboard.writeText", {
                text: json,
              });
              if (!result.ok) throw new Error("Clipboard write failed");
              setCopied(true);
            } finally {
              setCopying(false);
            }
          })();
        }}
      >
        {copying ? "Copying" : copied ? "Copied" : "Copy"}
      </Button>
    </>
  );
}
