import { Button, Settings } from "@pond/ui";
import { useState } from "react";
import { z } from "zod";

const McpSnippetSchema = z.object({ json: z.string().min(1) });

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
  const [copied, setCopied] = useState(false);
  const [copying, setCopying] = useState(false);
  const [error, setError] = useState("");

  const copyConfig = async () => {
    setCopying(true);
    setCopied(false);
    setError("");
    try {
      const payload = McpSnippetSchema.parse(
        await window.pond.query("agent.mcpSnippet", {}),
      );
      const result = await window.pond.query("clipboard.writeText", {
        text: payload.json,
      });
      if (!result.ok) throw new Error("Clipboard write failed");
      setCopied(true);
    } catch {
      setError("Could not copy config. Try again.");
    } finally {
      setCopying(false);
    }
  };

  return (
    <>
      <Settings.ItemDetails>
        <Settings.ItemTitle>Connect Cursor</Settings.ItemTitle>
        <Settings.ItemDescription>
          Add this config to Cursor's mcp.json.
        </Settings.ItemDescription>
        {error && (
          <Settings.ItemDescription role="alert">
            {error}
          </Settings.ItemDescription>
        )}
      </Settings.ItemDetails>
      <Settings.ItemControl>
        <Button
          size="sm"
          variant="secondary"
          disabled={copying}
          onClick={() => void copyConfig()}
        >
          {copying ? "Copying" : copied ? "Copied" : "Copy Config"}
        </Button>
      </Settings.ItemControl>
    </>
  );
}
