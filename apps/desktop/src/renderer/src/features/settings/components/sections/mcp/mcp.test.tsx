import { DEFAULT_PREFS } from "@pond/schema";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { McpSection, McpSnippet } from "./index";

const snippet = `{
  "mcpServers": {
    "pond": {
      "command": "/Applications/Pond.app/Contents/MacOS/Pond",
      "args": ["--mcp"]
    }
  }
}`;

beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

it.each([true, false])("reports native clipboard success=%s", async (ok) => {
  const writes: string[] = [];
  vi.stubGlobal("pond", {
    query: async (name: string, params: { text?: string }) => {
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
    await act(async () => root.render(<McpSnippet json={snippet} />));
    await act(async () => host.querySelector("button")?.click());
    expect(writes).toEqual([snippet]);
    expect(host.textContent).toContain(ok ? "Copied" : "Could not copy config");
  } finally {
    await act(async () => root.unmount());
    host.remove();
  }
});

it("shows setup hosts without detecting installs", async () => {
  vi.stubGlobal("pond", {
    query: async (name: string) => {
      if (name === "settings.getPrefs") return DEFAULT_PREFS;
      if (name === "agent.mcpSnippet") {
        throw new Error("Snippet unavailable");
      }
      throw new Error(`Unexpected query: ${name}`);
    },
  });
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  try {
    await act(async () =>
      root.render(
        <QueryClientProvider
          client={
            new QueryClient({
              defaultOptions: { queries: { retry: false } },
            })
          }
        >
          <McpSection />
        </QueryClientProvider>,
      ),
    );
    expect(host.textContent).toContain("Search Saves");
    expect(host.textContent).toContain("Cursor");
    expect(host.textContent).toContain("Claude Code");
    expect(host.textContent).toContain("More Agents");
    expect(host.textContent).not.toContain("Installed on this Mac");
    expect(host.textContent).not.toContain("Agents unavailable");
    expect(host.textContent).not.toContain("Any MCP Client");
    const more = [...host.querySelectorAll('[role="button"]')].find((node) =>
      node.textContent?.includes("More Agents"),
    );
    await act(async () =>
      more?.dispatchEvent(new MouseEvent("click", { bubbles: true })),
    );
    expect(host.textContent).toContain("Any MCP Client");
  } finally {
    await act(async () => root.unmount());
    host.remove();
  }
});
