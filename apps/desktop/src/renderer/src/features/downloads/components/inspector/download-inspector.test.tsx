import { Tooltip } from "@pond/ui";
import type { DownloadActivity } from "@shared/download-activity";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { libraryChrome } from "@/features/library";
import { savesStore } from "@/features/saves/pool";
import { DownloadInspector, DownloadInspectorView } from "./";

const activity: DownloadActivity = {
  taskId: "task-1",
  saveId: "save-1",
  op: "fetch_video_ytdlp",
  state: "running",
  startedAt: 1_000,
  updatedAt: 5_000,
  phase: "receiving",
  phaseStartedAt: 2_000,
  transfers: [
    {
      fileIndex: 2,
      fileCount: 3,
      state: "receiving",
      startedAt: 1_500,
      updatedAt: 5_000,
      lastByteAt: 5_000,
      receivedBytes: 38_000_000,
      totalBytes: 120_000_000,
      bytesPerSecond: 4_200_000,
      etaSeconds: 20,
      request: {
        method: "GET",
        host: "media.example.com",
        status: 200,
        contentType: "video/mp4",
        responseMs: 340,
      },
    },
  ],
  timeline: [
    { phase: "starting", at: 1_000 },
    { phase: "requesting", at: 1_500, fileIndex: 2 },
    { phase: "receiving", at: 2_000, fileIndex: 2 },
  ],
};

describe("download details", () => {
  let container: HTMLDivElement;
  let root: Root;
  beforeEach(() => {
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });
  afterEach(async () => {
    await act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });
  async function render(next?: DownloadActivity, error = false) {
    const onClose = vi.fn();
    const onOpenSave = vi.fn();
    const onRetry = vi.fn();
    await act(() =>
      root.render(
        <Tooltip.Provider>
          <DownloadInspectorView
            activity={{ status: error ? "error" : "ready", activity: next }}
            save={{ status: "ready", tasks: [] }}
            onClose={onClose}
            onOpenSave={onOpenSave}
            onRetry={onRetry}
          />
        </Tooltip.Provider>,
      ),
    );
    return { onClose, onOpenSave, onRetry };
  }
  it("shows only the collapsible activity timeline", async () => {
    await render(activity);
    expect(container.querySelector("h2")?.textContent).toBe("Details");
    const activityTrigger = Array.from(
      container.querySelectorAll<HTMLButtonElement>("button"),
    ).find((button) => button.textContent === "Activity");
    expect(activityTrigger?.getAttribute("aria-expanded")).toBe("true");
    expect(container.textContent).toContain("Preparing download");
    expect(container.textContent).toContain("Waiting for server response");
    expect(container.textContent).toContain("Downloading media");
    expect(container.textContent).not.toContain("Overview");
    expect(container.textContent).not.toContain("Network");
    expect(container.textContent).not.toContain("Attempts");
    expect(container.textContent).not.toContain("Output");
    expect(container.textContent).not.toContain("Metadata");
    expect(
      container.querySelector('[aria-label="Search activity"]'),
    ).toBeNull();
    expect(
      container.querySelector('[aria-label="Filter activity"]'),
    ).toBeNull();
    await act(() => activityTrigger?.click());
    expect(activityTrigger?.getAttribute("aria-expanded")).toBe("false");
  });

  it("keeps empty activity truthful and allows opening the save or closing details", async () => {
    const commands = await render();
    expect(container.textContent).toContain("No recent activity is available");
    await act(() =>
      container
        .querySelector<HTMLButtonElement>('button[aria-label="Close Details"]')
        ?.click(),
    );
    const open = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Open Save"]',
    );
    await act(() => open?.click());
    expect(commands.onClose).toHaveBeenCalledOnce();
    expect(commands.onOpenSave).toHaveBeenCalledOnce();
  });
  it("offers retry and stops claiming the failed activity is current", async () => {
    const commands = await render(activity, true);
    expect(container.textContent).toContain("Download activity is unavailable");
    expect(container.textContent).not.toContain("Now");
    const retry = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent === "Try Again",
    );
    await act(() => retry?.click());
    expect(commands.onRetry).toHaveBeenCalledOnce();
  });
});

describe("download inspector data", () => {
  let container: HTMLDivElement;
  let root: Root;
  let client: QueryClient;
  beforeEach(() => {
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        disconnect() {}
        unobserve() {}
      },
    );
    savesStore.setState((state) => ({
      byId: new Map(),
      sorted: [],
      revision: state.revision + 1,
    }));
    libraryChrome.inspectDownload("history-save");
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });
  afterEach(async () => {
    await act(() => root.unmount());
    client.clear();
    libraryChrome.inspectSave(null);
    container.remove();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });
  async function render() {
    await act(() =>
      root.render(
        <QueryClientProvider client={client}>
          <Tooltip.Provider>
            <DownloadInspector saveId="history-save" />
          </Tooltip.Provider>
        </QueryClientProvider>,
      ),
    );
  }
  it("hydrates an older completed save and stops activity polling when Details closes", async () => {
    const query = vi.fn(async (name: string) => {
      if (name === "settings.getPrefs") return {};
      if (name === "downloads.activity") return [];
      if (name === "saves.getMany")
        return [
          {
            id: "history-save",
            source: "youtube",
            sourceId: "history",
            url: "https://example.com/history",
            title: "Earlier download",
            status: "complete",
          },
        ];
      throw new Error(`Unexpected query: ${name}`);
    });
    vi.stubGlobal("pond", { query });
    await render();
    await act(async () => {
      await vi.waitFor(() =>
        expect(container.textContent).toContain("No recent activity"),
      );
    });
    expect(container.textContent).not.toContain("Overview");
    expect(container.textContent).not.toContain("Metadata");
    expect(
      container.querySelector('button[aria-label="Open Save"]'),
    ).not.toBeNull();
    expect(query).toHaveBeenCalledWith("saves.getMany", {
      ids: ["history-save"],
    });
    vi.useFakeTimers();
    await act(() => libraryChrome.closeRightPane());
    const calls = query.mock.calls.filter(
      ([name]) => name === "downloads.activity",
    ).length;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_500);
    });
    expect(
      query.mock.calls.filter(([name]) => name === "downloads.activity"),
    ).toHaveLength(calls);
  });
  it("shows a recoverable error when a save cannot be loaded", async () => {
    let fail = true;
    vi.stubGlobal("pond", {
      query: async (name: string) => {
        if (name === "settings.getPrefs") return {};
        if (name === "downloads.activity") return [];
        if (name === "saves.getMany") {
          if (fail) throw new Error("Library unavailable");
          return [
            {
              id: "history-save",
              source: "youtube",
              sourceId: "history",
              url: "https://example.com/history",
              title: "Waiting download",
              status: "ingesting",
              tasks: [],
            },
          ];
        }
        throw new Error(`Unexpected query: ${name}`);
      },
    });
    await render();
    await act(async () => {
      await vi.waitFor(() =>
        expect(container.textContent).toContain("Couldn't load this save."),
      );
    });
    expect(
      container.querySelector('button[aria-label="Open Save"]'),
    ).toBeNull();
    fail = false;
    const retry = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent === "Try Again",
    );
    await act(() => retry?.click());
    await act(async () => {
      await vi.waitFor(() =>
        expect(container.textContent).toContain("No recent activity"),
      );
    });
    expect(container.textContent).not.toContain("Couldn't load this save.");
    expect(
      container.querySelector('button[aria-label="Open Save"]'),
    ).toBeNull();
  });

  it("shows the recorded failure when live measurements are unavailable", async () => {
    vi.stubGlobal("pond", {
      query: async (name: string) => {
        if (name === "settings.getPrefs") return {};
        if (name === "downloads.activity") return [];
        if (name === "saves.getMany")
          return [
            {
              id: "history-save",
              source: "youtube",
              sourceId: "history",
              url: "https://example.com/history",
              title: "Failed download",
              status: "failed",
              tasks: [
                {
                  op: "fetch_video_ytdlp",
                  status: "dead",
                  attempts: 1,
                  maxAttempts: 5,
                  lastError: "Network unavailable",
                  nextRunAt: 0,
                  updatedAt: 1,
                },
              ],
            },
          ];
        throw new Error(`Unexpected query: ${name}`);
      },
    });
    await render();
    await act(async () => {
      await vi.waitFor(() =>
        expect(container.textContent).toContain("Stopped"),
      );
    });
    expect(container.textContent).toContain("Network unavailable");
    expect(container.textContent).toContain("Downloading video");
    expect(container.textContent).not.toContain("Metadata");
  });

  it("shows a restarted save as waiting instead of the previous attempt's finished activity", async () => {
    vi.stubGlobal("pond", {
      query: async (name: string) => {
        if (name === "settings.getPrefs") return {};
        if (name === "downloads.activity")
          return [
            {
              ...activity,
              saveId: "history-save",
              state: "failed",
              phase: "failed",
            },
          ];
        if (name === "saves.getMany")
          return [
            {
              id: "history-save",
              source: "youtube",
              sourceId: "history",
              url: "https://example.com/history",
              title: "Retried download",
              status: "ingesting",
              tasks: [],
            },
          ];
        throw new Error(`Unexpected query: ${name}`);
      },
    });
    await render();
    await act(async () => {
      await vi.waitFor(() =>
        expect(container.textContent).toContain("No recent activity"),
      );
    });
    expect(container.textContent).not.toContain("Stopped");
  });
});
