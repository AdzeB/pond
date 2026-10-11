import { DEFAULT_PREFS } from "@pond/schema";
import { Tooltip } from "@pond/ui";
import { ASSISTANT_MODELS } from "@shared/assistant";
import { modelsForChooser } from "@shared/provider-models";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, type ReactNode, useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  ModelCatalogTable,
  ModelsSection,
  RecommendedLocalModels,
} from "./index";

const connectedProviders = ASSISTANT_MODELS.map((entry) => ({
  provider: entry.id,
  hasKey: true,
  enabled: true,
  masked: null,
}));

function wrap(node: ReactNode) {
  return <Tooltip.Provider>{node}</Tooltip.Provider>;
}

function renderWithQuery(host: HTMLDivElement, node: ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const root = createRoot(host);
  return {
    root,
    client,
    render: (content = node) =>
      root.render(
        <QueryClientProvider client={client}>
          {wrap(content)}
        </QueryClientProvider>,
      ),
  };
}

beforeEach(() => {});

afterEach(() => {
  vi.unstubAllGlobals();
});

it("shows explicit Ollama install commands without starting a model pull", async () => {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  const copied: string[] = [];
  const selected: string[] = [];
  try {
    await act(async () =>
      root.render(
        wrap(
          <RecommendedLocalModels
            providers={[
              {
                id: "ollama",
                provider: "Ollama",
                setupUrl: "https://ollama.com",
              },
            ]}
            installedModels={[]}
            selectedModelIds={{}}
            onCopyCommand={(command) => {
              copied.push(command);
            }}
            onOpenSetup={() => {
              throw new Error("Ollama installation must copy a command");
            }}
            onSelect={(provider, id) => {
              selected.push(`${provider}:${id}`);
            }}
          />,
        ),
      ),
    );
    expect(host.textContent).toContain("Gemma 4 E2B");
    expect(host.textContent).toContain("ollama pull gemma4:e2b");
    expect(host.textContent).toContain("Estimated download: 4.6 GB");
    const copy = [...host.querySelectorAll("button")].find(
      (button) => button.textContent === "Copy Install Command",
    );
    expect(copy).not.toBeUndefined();
    await act(async () => copy?.click());
    expect(copied).toEqual(["ollama pull gemma4:e2b"]);
    expect(selected).toEqual([]);
  } finally {
    await act(async () => root.unmount());
    host.remove();
  }
});

it("selects installed recommendations and prefers runtime-reported size", async () => {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  const selected: string[] = [];
  try {
    await act(async () =>
      root.render(
        wrap(
          <RecommendedLocalModels
            providers={[
              {
                id: "ollama",
                provider: "Ollama",
                setupUrl: "https://ollama.com",
              },
            ]}
            installedModels={[
              {
                id: "gemma4:e2b",
                name: "gemma4:e2b",
                provider: "ollama",
                providerName: "Ollama",
                sizeBytes: 4_800_000_000,
              },
            ]}
            selectedModelIds={{}}
            onCopyCommand={() => {
              throw new Error("Installed models must not show install actions");
            }}
            onOpenSetup={() => {
              throw new Error("Installed models must not open setup");
            }}
            onSelect={(provider, id) => {
              selected.push(`${provider}:${id}`);
            }}
          />,
        ),
      ),
    );
    expect(host.textContent).toContain("Installed size: 4.8 GB");
    expect(host.textContent).not.toContain("Estimated download: 4.6 GB");
    const select = [...host.querySelectorAll("button")].find(
      (button) => button.textContent === "Select",
    );
    expect(select).not.toBeUndefined();
    await act(async () => select?.click());
    expect(selected).toEqual(["ollama:gemma4:e2b"]);
  } finally {
    await act(async () => root.unmount());
    host.remove();
  }
});

it("opens the existing LM Studio setup URL for unavailable recommendations", async () => {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  const opened: string[] = [];
  try {
    await act(async () =>
      root.render(
        wrap(
          <RecommendedLocalModels
            providers={[
              {
                id: "lmstudio",
                provider: "LM Studio",
                setupUrl: "https://lmstudio.ai",
              },
            ]}
            installedModels={[]}
            selectedModelIds={{}}
            onCopyCommand={() => {
              throw new Error("LM Studio must use its setup URL");
            }}
            onOpenSetup={(url) => {
              opened.push(url);
            }}
            onSelect={() => {
              throw new Error("Unavailable models must not be selectable");
            }}
          />,
        ),
      ),
    );
    expect(host.textContent).toContain(
      "Find this model in LM Studio. Estimated download: 4.6 GB.",
    );
    const open = [...host.querySelectorAll("button")].find(
      (button) => button.textContent === "Open LM Studio",
    );
    expect(open).not.toBeUndefined();
    await act(async () => open?.click());
    expect(opened).toEqual(["https://lmstudio.ai"]);
  } finally {
    await act(async () => root.unmount());
    host.remove();
  }
});

it("copies Ollama commands through the desktop clipboard query", async () => {
  const calls: Array<{ name: string; params?: { text?: string } }> = [];
  vi.stubGlobal("pond", {
    query: async (name: string, params?: { text?: string }) => {
      calls.push({ name, params });
      if (name === "settings.getPrefs") return DEFAULT_PREFS;
      if (name === "agent.keys") {
        return [
          {
            provider: "ollama",
            hasKey: true,
            enabled: true,
            masked: "local",
          },
        ];
      }
      if (name === "agent.listModels") return { ok: true, models: [] };
      if (name === "clipboard.writeText") return { ok: true };
      throw new Error(`Unexpected query: ${name}`);
    },
    openExternal: async () => ({ ok: true }),
  });
  const host = document.createElement("div");
  document.body.append(host);
  const { root, render, client } = renderWithQuery(host, <ModelsSection />);
  try {
    await act(async () => render());
    await vi.waitFor(() =>
      expect(host.textContent).toContain("ollama pull gemma4:e2b"),
    );
    const copy = [...host.querySelectorAll("button")].find(
      (button) => button.textContent === "Copy Install Command",
    );
    await act(async () => copy?.click());
    await vi.waitFor(() =>
      expect(calls).toContainEqual({
        name: "clipboard.writeText",
        params: { text: "ollama pull gemma4:e2b" },
      }),
    );
    expect(calls.map((call) => call.name)).not.toContain("agent.pullModel");
  } finally {
    await act(async () => root.unmount());
    client.clear();
    host.remove();
  }
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
      [...host.querySelectorAll("thead th")].map(
        (header) => header.textContent,
      ),
    ).toEqual(["Model", "Input", "Output", "Context", ""]);
    expect(
      [...host.querySelectorAll("h2 button")].map((header) =>
        header.getAttribute("aria-label"),
      ),
    ).toEqual(["OpenAI"]);
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

it("explains unavailable selection and opens provider settings", async () => {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  let saves = 0;
  let openedProviders = false;
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
            onOpenProviders={() => {
              openedProviders = true;
            }}
          />,
        ),
      ),
    );
    expect(host.textContent).toContain(
      "Check the provider connection to select models.",
    );
    const openProviders = [...host.querySelectorAll("button")].find(
      (button) => button.textContent === "Open Providers",
    );
    await act(async () => openProviders?.click());
    expect(openedProviders).toBe(true);
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

it("collapses providers independently and reveals search matches", async () => {
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
    expect(
      [...host.querySelectorAll("h2 button")].map((header) =>
        header.getAttribute("aria-label"),
      ),
    ).toEqual(["OpenAI", "Anthropic"]);
    const anthropic = host.querySelector<HTMLButtonElement>(
      'h2 button[aria-label="Anthropic"]',
    );
    if (!anthropic) throw new Error("Missing provider toggle");
    expect(anthropic.getAttribute("aria-expanded")).toBe("true");
    await act(async () => anthropic.click());
    expect(anthropic.getAttribute("aria-expanded")).toBe("false");
    await vi.waitFor(() => {
      expect(host.textContent).not.toContain("Claude Sonnet 4");
    });
    expect(host.textContent).toContain("GPT-4.1");
    await act(async () => anthropic.click());
    expect(anthropic.getAttribute("aria-expanded")).toBe("true");
    expect(host.textContent).toContain("Claude Sonnet 4");
    await act(async () => anthropic.click());
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
    expect(
      [...host.querySelectorAll("h2 button")].map((header) =>
        header.getAttribute("aria-label"),
      ),
    ).toEqual(["Anthropic"]);
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
      if (name === "agent.keys") return connectedProviders;
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
      if (name === "agent.keys") return connectedProviders;
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

it("shows ready providers while another provider is still loading", async () => {
  const slow = Promise.withResolvers<{ ok: true; models: [] }>();
  vi.stubGlobal("pond", {
    query: async (name: string, params?: { provider?: string }) => {
      if (name === "settings.getPrefs") return DEFAULT_PREFS;
      if (name === "agent.keys") return connectedProviders;
      if (name === "agent.listModels") {
        if (params?.provider === "lmstudio") return slow.promise;
        return {
          ok: true,
          models:
            params?.provider === "openai"
              ? [{ id: "gpt-4.1", name: "GPT-4.1" }]
              : [],
        };
      }
      throw new Error(`Unexpected query: ${name}`);
    },
  });
  const host = document.createElement("div");
  document.body.append(host);
  const { root, render, client } = renderWithQuery(host, <ModelsSection />);
  try {
    await act(async () => render());
    await vi.waitFor(() => expect(host.textContent).toContain("GPT-4.1"));
    expect(
      host.querySelector('button[aria-label="Loading models"]'),
    ).not.toBeNull();
    await act(async () => slow.resolve({ ok: true, models: [] }));
    await vi.waitFor(() =>
      expect(host.querySelector('button[aria-label="Refresh"]')).not.toBeNull(),
    );
  } finally {
    slow.resolve({ ok: true, models: [] });
    await act(async () => root.unmount());
    client.clear();
    host.remove();
  }
});

it("keeps cached models across page visits and refreshes stale data in place", async () => {
  let calls = 0;
  let waiting = false;
  let offline = false;
  const refresh = Promise.withResolvers<{
    ok: true;
    models: { id: string; name: string }[];
  }>();
  vi.stubGlobal("pond", {
    query: async (name: string, params?: { provider?: string }) => {
      if (name === "settings.getPrefs") return DEFAULT_PREFS;
      if (name === "agent.keys") return connectedProviders;
      if (name === "agent.listModels") {
        calls++;
        if (offline) throw new Error("offline");
        if (waiting && params?.provider === "openai") return refresh.promise;
        return {
          ok: true,
          models:
            params?.provider === "openai"
              ? [{ id: "gpt-4.1", name: "GPT-4.1" }]
              : [],
        };
      }
      throw new Error(`Unexpected query: ${name}`);
    },
  });
  const host = document.createElement("div");
  document.body.append(host);
  const { root, render, client } = renderWithQuery(host, <ModelsSection />);
  try {
    await act(async () => render());
    await vi.waitFor(() => expect(host.textContent).toContain("GPT-4.1"));
    const initialCalls = calls;
    vi.useFakeTimers();
    await act(async () => render(null));
    await act(async () => vi.advanceTimersByTimeAsync(6 * 60_000));
    await act(async () => render());
    expect(host.textContent).toContain("GPT-4.1");
    expect(calls).toBe(initialCalls);
    await act(async () => render(null));
    waiting = true;
    await act(async () => vi.advanceTimersByTimeAsync(10 * 60_000));
    await act(async () => render());
    expect(calls).toBeGreaterThan(initialCalls);
    expect(host.textContent).toContain("GPT-4.1");
    expect(
      host.querySelector('[aria-label="Loading models"][aria-busy="true"]'),
    ).toBeNull();
    await act(async () => {
      refresh.resolve({
        ok: true,
        models: [{ id: "gpt-new", name: "New model" }],
      });
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(host.textContent).toContain("New model");
    expect(host.textContent).not.toContain("GPT-4.1");
    waiting = false;
    const beforeInvalidation = calls;
    await act(async () => {
      await client.invalidateQueries({ queryKey: ["all-provider-models"] });
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(calls).toBeGreaterThan(beforeInvalidation);
    expect(host.textContent).toContain("GPT-4.1");
    offline = true;
    const refreshButton = host.querySelector<HTMLButtonElement>(
      'button[aria-label="Refresh"]',
    );
    if (!refreshButton) throw new Error("Missing refresh button");
    await act(async () => {
      refreshButton.click();
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(host.textContent).toContain("GPT-4.1");
    expect(host.textContent).toContain(
      "Some providers could not load models. Try again.",
    );
    expect(host.textContent).not.toContain("Models unavailable");
  } finally {
    refresh.resolve({ ok: true, models: [] });
    await act(async () => root.unmount());
    client.clear();
    vi.useRealTimers();
    host.remove();
  }
});

it("shows an accessible loading placeholder only before the first catalog arrives", async () => {
  const ready = Promise.withResolvers<void>();
  vi.stubGlobal("pond", {
    query: async (name: string) => {
      if (name === "settings.getPrefs") return DEFAULT_PREFS;
      if (name === "agent.keys") return connectedProviders;
      if (name === "agent.listModels") {
        await ready.promise;
        return { ok: true, models: [] };
      }
      throw new Error(`Unexpected query: ${name}`);
    },
  });
  const host = document.createElement("div");
  document.body.append(host);
  const { root, render, client } = renderWithQuery(host, <ModelsSection />);
  try {
    await act(async () => render());
    expect(
      host.querySelector('[aria-label="Loading models"][aria-busy="true"]'),
    ).not.toBeNull();
    expect(host.querySelector('[role="status"]')?.textContent).toBe(
      "Loading models",
    );
    expect(host.querySelector('[role="checkbox"]')).toBeNull();
    await act(async () => ready.resolve());
    await vi.waitFor(() =>
      expect(host.textContent).toContain("Connect a provider first."),
    );
    expect(host.querySelector('[aria-busy="true"]')).toBeNull();
  } finally {
    ready.resolve();
    await act(async () => root.unmount());
    client.clear();
    host.remove();
  }
});

it("only requests connected enabled providers and hides disconnected cached models", async () => {
  let connections = [
    { provider: "openai", hasKey: true, enabled: true, masked: null },
    { provider: "anthropic", hasKey: false, enabled: true, masked: null },
    { provider: "lmstudio", hasKey: false, enabled: true, masked: null },
    { provider: "gemini", hasKey: true, enabled: false, masked: null },
  ];
  const requested: string[] = [];
  vi.stubGlobal("pond", {
    query: async (name: string, params?: { provider?: string }) => {
      if (name === "settings.getPrefs") return DEFAULT_PREFS;
      if (name === "agent.keys") return connections;
      if (name === "agent.listModels" && params?.provider) {
        requested.push(params.provider);
        return { ok: true, models: [{ id: "live-model", name: "Live model" }] };
      }
      throw new Error(`Unexpected query: ${name}`);
    },
  });
  const host = document.createElement("div");
  document.body.append(host);
  const { root, render, client } = renderWithQuery(host, <ModelsSection />);
  client.setQueryData(["all-provider-models", "anthropic"], {
    ok: true,
    models: [{ id: "old-model", name: "Cached disconnected model" }],
  });
  try {
    await act(async () => render());
    await vi.waitFor(() => expect(host.textContent).toContain("Live model"));
    expect(requested).toEqual(["openai"]);
    expect(host.textContent).not.toContain("Cached disconnected model");
    expect(host.textContent).not.toContain("LM Studio");
    expect(host.textContent).not.toContain("Google");
    connections = [];
    await act(async () =>
      client.invalidateQueries({ queryKey: ["agent-provider-connections"] }),
    );
    await vi.waitFor(() =>
      expect(host.textContent).toContain("Connect a provider first."),
    );
    expect(host.textContent).not.toContain("Live model");
    expect(host.textContent).not.toContain("Models unavailable");
    expect(requested).toEqual(["openai"]);
    connections = [
      { provider: "ollama", hasKey: true, enabled: true, masked: null },
    ];
    await act(async () =>
      client.invalidateQueries({ queryKey: ["agent-provider-connections"] }),
    );
    await vi.waitFor(() => expect(host.textContent).toContain("Ollama"));
    expect(host.textContent).toContain("Live model");
    expect(requested).toEqual(["openai", "ollama"]);
  } finally {
    await act(async () => root.unmount());
    client.clear();
    host.remove();
  }
});
