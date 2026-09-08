// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { McpCursorRow } from "./mcp";

it.each([true, false])("reports native clipboard success=%s", async (ok) => {
  const writes: string[] = [];
  const snippet = '{"mcpServers":{}}';
  vi.stubGlobal("pond", {
    query: async (name: string, params: { text?: string }) => {
      if (name === "agent.mcpSnippet") return { json: snippet };
      if (name === "clipboard.writeText") {
        writes.push(params.text ?? "");
        return { ok };
      }
      throw new Error(`Unexpected query: ${name}`);
    },
  });
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  try {
    await act(async () => root.render(<McpCursorRow />));
    await act(async () => host.querySelector("button")?.click());
    expect(writes).toEqual([snippet]);
    expect(host.textContent).toContain(ok ? "Copied" : "Could not copy config");
  } finally {
    await act(async () => root.unmount());
    host.remove();
    vi.unstubAllGlobals();
  }
});
