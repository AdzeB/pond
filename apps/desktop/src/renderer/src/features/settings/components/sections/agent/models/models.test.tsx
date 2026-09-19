import { DEFAULT_PREFS } from "@pond/schema";
import { Tooltip } from "@pond/ui";
import { modelsForChooser } from "@shared/provider-models";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, type ReactNode, useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ModelCatalogTable, ModelsSection } from "./index";

function wrap(node: ReactNode) {
  return <Tooltip.Provider>{node}</Tooltip.Provider>;
}

function renderWithQuery(host: HTMLDivElement, node: ReactNode) {
  const root = createRoot(host);
  return {
    root,
    render: () =>
      root.render(
        <QueryClientProvider
          client={
            new QueryClient({
              defaultOptions: { queries: { retry: false } },
            })
          }
        >
          {wrap(node)}
        </QueryClientProvider>,
      ),
  };
}

beforeEach(() => {});

afterEach(() => {
  vi.unstubAllGlobals();
});

it("persists visibility, preserves it after rejection, and restores all models", async () => {
  const models = [
    {
      id: "alpha",
      name: "Alpha",
      provider: "openai" as const,
      providerName: "OpenAI",
      contextWindow: 200000,
      maxOutputTokens: 8192,
      pricing: { input: "0.000002", output: "0.000008" },
    },
    {
      id: "beta",
      name: "Beta",
      provider: "openai" as const,
      providerName: "OpenAI",
    },
  ];
  let reject = false;
  let saved: Record<string, string[]> | undefined;
  function Harness() {
    const [ids, setIds] = useState<Record<string, string[]>>({});
    return (
      <ModelCatalogTable
        models={models}
        visibleByProvider={ids}
        onSave={async (next) => {
          if (reject) throw new Error("Disk unavailable");
          saved = next;
          setIds(next);
        }}
      />
    );
  }
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  try {
    await act(async () => root.render(wrap(<Harness />)));
    const alpha = host.querySelector<HTMLButtonElement>(
      '[aria-label="Show Alpha in model pickers"]',
    );
    if (!alpha) throw new Error("Missing model checkbox");
    expect(host.textContent).toContain("200K");
    expect(host.textContent).toContain("OpenAI");
    expect(host.textContent).not.toContain("Max Output");
    expect(host.textContent).toContain("$2/M");
    expect(host.textContent).toContain("$8/M");
    expect(
      [...host.querySelectorAll("th")].map((header) => header.textContent),
    ).toEqual(["Model", "Provider", "Input", "Output", "Context", ""]);
    expect(host.querySelector("th[aria-label='Show']")).not.toBeNull();
    expect(
      host.querySelector('[aria-label="Input $2 per million tokens"]'),
    ).not.toBeNull();
    expect(
      host.querySelector('[aria-label="Output $8 per million tokens"]'),
    ).not.toBeNull();
    expect(
      host.querySelector('[aria-label="200,000 token context window"]'),
    ).not.toBeNull();
    expect(
      host.querySelector('[aria-label="Not reported by provider"]'),
    ).not.toBeNull();
    await act(async () => alpha.click());
    expect(saved?.openai).toEqual(["beta"]);
    expect(modelsForChooser(models, saved?.openai)).toEqual([models[1]]);
    expect(host.textContent).toContain("Alpha");
    reject = true;
    await act(async () => alpha.click());
    expect(saved?.openai).toEqual(["beta"]);
    expect(alpha.getAttribute("aria-checked")).toBe("false");
    expect(host.querySelector('[role="alert"]')?.textContent).toContain(
      "Could not save",
    );
    reject = false;
    const hideAll = [...host.querySelectorAll("button")].find(
      (button) => button.textContent === "Hide All",
    );
    await act(async () => hideAll?.click());
    expect(saved?.openai).toEqual([]);
    const showAll = [...host.querySelectorAll("button")].find(
      (button) => button.textContent === "Show All",
    );
    await act(async () => showAll?.click());
    expect(saved?.openai).toEqual(["alpha", "beta"]);
  } finally {
    await act(async () => root.unmount());
    host.remove();
  }
});

it("keeps disconnected catalog previews out of visibility changes", async () => {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  let saves = 0;
  try {
    await act(async () =>
      root.render(
        wrap(
          <ModelCatalogTable
            models={[
              {
                id: "cloud/test",
                name: "Catalog Model",
                provider: "openai",
                providerName: "OpenAI",
                available: false,
              },
            ]}
            visibleByProvider={{}}
            onSave={async () => {
              saves++;
            }}
          />,
        ),
      ),
    );
    expect(host.textContent).not.toContain("Connect this provider");
    const checkbox = host.querySelector<HTMLButtonElement>('[role="checkbox"]');
    expect(checkbox).not.toBeNull();
    expect(checkbox?.getAttribute("aria-checked")).toBe("false");
    await act(async () => checkbox?.click());
    const showAll = [...host.querySelectorAll("button")].find(
      (button) => button.textContent === "Show All",
    );
    expect(showAll?.disabled).toBe(true);
    expect(saves).toBe(0);
  } finally {
    await act(async () => root.unmount());
    host.remove();
  }
});

it("filters the catalog by provider name", async () => {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  try {
    await act(async () =>
      root.render(
        wrap(
          <ModelCatalogTable
            models={[
              {
                id: "gpt-4.1",
                name: "GPT-4.1",
                provider: "openai",
                providerName: "OpenAI",
              },
              {
                id: "claude-sonnet-4",
                name: "Claude Sonnet 4",
                provider: "anthropic",
                providerName: "Anthropic",
              },
            ]}
            visibleByProvider={{}}
            onSave={async () => {}}
          />,
        ),
      ),
    );
    expect(host.textContent).toContain("GPT-4.1");
    expect(host.textContent).toContain("Claude Sonnet 4");
    const search = host.querySelector('[aria-label="Search models"]');
    if (!(search instanceof HTMLInputElement))
      throw new Error("Missing search field");
    await act(async () => {
      search.focus();
      Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      )?.set?.call(search, "Anthropic");
      search.dispatchEvent(new InputEvent("input", { bubbles: true }));
    });
    expect(host.textContent).toContain("Claude Sonnet 4");
    expect(host.textContent).not.toContain("GPT-4.1");
  } finally {
    await act(async () => root.unmount());
    host.remove();
  }
});

it("tells you to connect a provider when the catalog is empty", async () => {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  try {
    await act(async () =>
      root.render(
        wrap(
          <ModelCatalogTable
            models={[]}
            visibleByProvider={{}}
            onSave={async () => {}}
          />,
        ),
      ),
    );
    expect(host.textContent).toContain(
      "No models found. Connect a provider first.",
    );
    expect(host.textContent).toContain("0 of 0 models shown");
  } finally {
    await act(async () => root.unmount());
    host.remove();
  }
});

it("shows a retryable unavailable state when the catalog fails to load", async () => {
  let listCalls = 0;
  vi.stubGlobal("pond", {
    query: async (name: string) => {
      if (name === "settings.getPrefs") return DEFAULT_PREFS;
      if (name === "agent.listModels") {
        listCalls++;
        throw new Error("offline");
      }
      throw new Error(`Unexpected query: ${name}`);
    },
  });
  const host = document.createElement("div");
  document.body.append(host);
  const { root, render } = renderWithQuery(host, <ModelsSection />);
  try {
    await act(async () => render());
    await vi.waitFor(() => {
      expect(host.textContent).toContain("Models unavailable");
    });
    expect(host.textContent).toContain("Could not load models. Try again.");
    expect(host.textContent).not.toContain("Connect a provider first");
    expect(host.textContent).not.toContain("Show All");
    const retry = [...host.querySelectorAll("button")].find(
      (button) => button.textContent === "Retry",
    );
    expect(retry).not.toBeUndefined();
    const before = listCalls;
    await act(async () => retry?.click());
    expect(listCalls).toBeGreaterThan(before);
  } finally {
    await act(async () => root.unmount());
    host.remove();
  }
});

it("keeps loaded models when some providers fail", async () => {
  vi.stubGlobal("pond", {
    query: async (name: string, params?: { provider?: string }) => {
      if (name === "settings.getPrefs") return DEFAULT_PREFS;
      if (name === "agent.listModels") {
        if (params?.provider === "openai") {
          return {
            ok: true,
            models: [{ id: "gpt-4.1", name: "GPT-4.1" }],
          };
        }
        return {
          ok: false,
          models: [],
          error: `Could not load models from ${params?.provider}. Try again.`,
        };
      }
      throw new Error(`Unexpected query: ${name}`);
    },
  });
  const host = document.createElement("div");
  document.body.append(host);
  const { root, render } = renderWithQuery(host, <ModelsSection />);
  try {
    await act(async () => render());
    await vi.waitFor(() => {
      expect(host.textContent).toContain("GPT-4.1");
    });
    expect(host.textContent).toContain(
      "Some providers could not load models. Try again.",
    );
    expect(host.textContent).toContain("Retry");
    expect(host.textContent).toContain("Show All");
    expect(host.textContent).not.toContain("Models unavailable");
  } finally {
    await act(async () => root.unmount());
    host.remove();
  }
});
