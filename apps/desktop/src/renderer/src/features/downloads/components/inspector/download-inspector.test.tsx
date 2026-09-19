import { Tooltip } from "@pond/ui";
import type { DownloadActivity } from "@shared/download-activity";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { libraryChrome } from "@/features/library/state/library-chrome";
import { savesStore } from "@/features/saves/state/pool";
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
  async function render(next?: DownloadActivity, now = 5_000, error = false) {
    const onClose = vi.fn();
    const onOpenSave = vi.fn();
    const onRetry = vi.fn();
    await act(() =>
      root.render(
        <Tooltip.Provider>
          <DownloadInspectorView
            activity={next}
            now={now}
            error={error}
            onClose={onClose}
            onOpenSave={onOpenSave}
            onRetry={onRetry}
          />
        </Tooltip.Provider>,
      ),
    );
    return { onClose, onOpenSave, onRetry };
  }
  it("shows measured transfer progress and expandable request timings", async () => {
    await render(activity);
    expect(container.textContent).toContain("38 MB / 120 MB");
    expect(container.textContent).toContain("4.2 MB/s");
    expect(container.textContent).toContain("File 2 of 3");
    expect(container.textContent?.match(/File 2 of 3/g)).toHaveLength(1);
    expect(container.textContent).toContain("340 ms");
    expect(container.textContent).toContain("media.example.com");
    expect(container.querySelector("progress")?.value).toBeCloseTo(31.666);
    const trigger = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent === "Request Details",
    );
    expect(trigger?.getAttribute("aria-expanded")).toBe("true");
    await act(() => trigger?.click());
    expect(trigger?.getAttribute("aria-expanded")).toBe("false");
  });
  it("omits percentages, speeds, and request fields when no measurements exist", async () => {
    await render({ ...activity, phase: "processing", transfers: [] });
    expect(container.querySelector("progress")).toBeNull();
    expect(container.textContent).not.toContain("%");
    expect(container.textContent).not.toContain("MB/s");
    expect(container.textContent).not.toContain("Request Details");
  });

  it("keeps simultaneous file transfers separate", async () => {
    await render({
      ...activity,
      transfers: [
        ...activity.transfers,
        {
          fileIndex: 3,
          fileCount: 3,
          state: "receiving",
          startedAt: 3_000,
          updatedAt: 5_000,
          receivedBytes: 1_000_000,
          totalBytes: 2_000_000,
        },
      ],
    });
    expect(container.querySelectorAll("progress")).toHaveLength(2);
    expect(container.textContent).toContain("38 MB / 120 MB");
    expect(container.textContent).toContain("1 MB / 2 MB");
    expect(container.textContent).toContain("File 3 of 3");
  });
  it("explains a stalled transfer and removes stale speed and estimates", async () => {
    await render(activity, 22_000);
    expect(container.textContent).toContain("No data received for 17s");
    expect(container.textContent).not.toContain("4.2 MB/s");
    expect(container.textContent).not.toContain("left");
  });

  it("does not revive stale speed when a transfer reports without new bytes", async () => {
    await render(
      {
        ...activity,
        transfers: activity.transfers.map((transfer) => ({
          ...transfer,
          updatedAt: 22_000,
        })),
      },
      22_000,
    );
    expect(container.textContent).not.toContain("4.2 MB/s");
    expect(container.textContent).not.toContain("left");
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
  it("offers retry and stops claiming live speed after an activity query fails", async () => {
    const commands = await render(activity, 5_000, true);
    expect(container.textContent).toContain("Download activity is unavailable");
    expect(container.textContent).not.toContain("4.2 MB/s");
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
        expect(container.textContent).toContain("Completed"),
      );
    });
    expect(container.textContent).toContain("Completed");
    expect(container.textContent).toContain("Properties");
    expect(container.textContent).toContain("YouTube");
    expect(container.textContent).toContain("File");
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
        expect(container.textContent).toContain("In Progress"),
      );
    });
    expect(container.textContent).toContain("In Progress");
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
                  status: "failed",
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
      await vi.waitFor(() => expect(container.textContent).toContain("Failed"));
    });
    expect(container.textContent).toContain("Network unavailable");
    expect(container.textContent).toContain("Downloading video");
    expect(container.textContent).toContain("YouTube");
    expect(container.querySelector("progress")).toBeNull();
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
        expect(container.textContent).toContain("In Progress"),
      );
    });
    expect(container.textContent).toContain("In Progress");
    expect(container.textContent).toContain("Loading save details");
    expect(container.textContent).toContain("Properties");
    expect(container.textContent).not.toContain("Stopped");
    expect(container.querySelector("progress")).toBeNull();
  });
});
