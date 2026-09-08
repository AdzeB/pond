// @vitest-environment jsdom
import { DEFAULT_PREFS } from "@pond/schema";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { ProviderCard } from "./provider";

it.each([
  true,
  false,
])("connects a local provider explicitly, success=%s", async (ok) => {
  const operations: string[] = [];
  let refreshed = false;
  vi.stubGlobal("pond", {
    query: async (name: string) => {
      operations.push(name);
      if (name === "agent.listModels") return { ok: true, models: [] };
      return { ok, error: ok ? undefined : "Connection refused" };
    },
  });
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  try {
    await act(async () =>
      root.render(
        <QueryClientProvider client={new QueryClient()}>
          <ProviderCard
            catalog={{ id: "ollama", provider: "Ollama", needsKey: false }}
            row={undefined}
            agent={DEFAULT_PREFS.agent}
            onDismiss={() => {}}
            onPatchAgent={() => {}}
            onRefresh={async () => {
              refreshed = true;
            }}
          />
        </QueryClientProvider>,
      ),
    );
    expect(host.querySelector('[aria-label="Custom model ID"]')).toBeNull();
    const connect = Array.from(host.querySelectorAll("button")).find(
      (button) => button.textContent === "Connect",
    );
    expect(connect).toBeDefined();
    await act(async () => connect?.click());
    expect(operations).toContain("agent.saveKey");
    expect(refreshed).toBe(ok);
    if (!ok) {
      expect(host.querySelector('[role="alert"]')?.textContent).toBe(
        "Connection refused",
      );
      expect(host.querySelector('input[type="password"]')).not.toBeNull();
    }
  } finally {
    await act(async () => root.unmount());
    host.remove();
    vi.unstubAllGlobals();
  }
});

it("shows a saved-key placeholder without exposing the saved credential", async () => {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  try {
    await act(async () =>
      root.render(
        <QueryClientProvider client={new QueryClient()}>
          <ProviderCard
            catalog={{ id: "openai", provider: "OpenAI", needsKey: true }}
            row={{
              provider: "openai",
              hasKey: true,
              masked: "saved-key",
              enabled: true,
            }}
            agent={DEFAULT_PREFS.agent}
            onPatchAgent={async () => {}}
            onRefresh={async () => {}}
            onDismiss={() => {}}
          />
        </QueryClientProvider>,
      ),
    );
    expect(
      host.querySelector('input[type="password"]')?.getAttribute("placeholder"),
    ).toBe("saved-key");
    expect(host.querySelector('[aria-label="Search models"]')).toBeNull();
  } finally {
    await act(async () => root.unmount());
    host.remove();
  }
});
