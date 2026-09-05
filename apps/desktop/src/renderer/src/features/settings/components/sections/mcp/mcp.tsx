import { Button, Settings } from "@pond/ui";
import { useEffect, useState } from "react";
import { z } from "zod";

const McpSnippetSchema = z.object({ json: z.string().optional() });

export function McpSection() {
  return (
    <Settings.Page>
      <Settings.Header>
        <Settings.HeaderText>
          <Settings.Title>MCP</Settings.Title>
          <Settings.Description>
            Copy a stdio snippet so Cursor can search this library. Pond does
            not host an MCP endpoint.
          </Settings.Description>
        </Settings.HeaderText>
      </Settings.Header>

      <Settings.Section>
        <Settings.SectionTitle>Cursor</Settings.SectionTitle>
        <Settings.List>
          <Settings.Item>
            <McpCursorRow />
          </Settings.Item>
        </Settings.List>
      </Settings.Section>
    </Settings.Page>
  );
}

export function McpCursorRow() {
  const [snippet, setSnippet] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    void window.pond.query("agent.mcpSnippet", {}).then((res) => {
      const payload = McpSnippetSchema.parse(res);
      setSnippet(payload.json ?? "");
    });
  }, []);

  return (
    <>
      <Settings.ItemDetails>
        <Settings.ItemTitle>stdio Config</Settings.ItemTitle>
        <Settings.ItemDescription>
          Paste this into mcp.json. Cursor talks to Pond over stdio on this Mac.
        </Settings.ItemDescription>
      </Settings.ItemDetails>
      <Settings.ItemControl>
        <Button
          size="sm"
          variant="secondary"
          disabled={!snippet}
          onClick={() => {
            void navigator.clipboard.writeText(snippet).then(() => {
              setCopied(true);
            });
          }}
        >
          {copied ? "Copied" : "Copy Config"}
        </Button>
      </Settings.ItemControl>
    </>
  );
}
