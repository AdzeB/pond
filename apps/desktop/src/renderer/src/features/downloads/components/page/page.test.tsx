// @vitest-environment jsdom
import { Tooltip } from "@pond/ui";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { downloadsSelection } from "@/features/downloads/state/downloads-selection";
import { primarySelection } from "@/features/library/state/selection";
import { savesStore } from "@/features/saves/state/pool";
import type { Save } from "@/features/saves/types";
import { DownloadsPage } from "./page";

function save(
  id: string,
  status: Save["status"],
  taskStatus?: "running" | "pending" | "failed",
): Save {
  return {
    id,
    source: "youtube",
    sourceId: id,
    url: `https://example.com/${id}`,
    title: id,
    description: null,
    author: null,
    notes: null,
    mediaUrl: null,
    mediaType: null,
    files: [],
    tags: [],
    savedAt: 1,
    createdAt: 1,
    deletedAt: null,
    status,
    tasks: taskStatus
      ? [
          {
            op: "fetch_video_ytdlp",
            status: taskStatus,
            attempts: 1,
            maxAttempts: 5,
            lastError: taskStatus === "failed" ? "Network unavailable" : null,
            nextRunAt: 0,
            updatedAt: 1,
          },
        ]
      : [],
  };
}
function setSaves(saves: Save[]) {
  savesStore.setState((state) => ({
    byId: new Map(saves.map((save) => [save.id, save])),
    sorted: saves,
    revision: state.revision + 1,
  }));
}
let host: HTMLDivElement;
let root: Root;
let client: QueryClient;
const query = vi.fn();
const pipelinePause = vi.fn(async (paused: boolean) => ({ ok: true, paused }));
const pipelineCancelSave = vi.fn(async () => ({ ok: true, cancelled: true }));

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
      unobserve() {}
    },
  );
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  }));
  vi.clearAllMocks();
  primarySelection.set(null);
  Object.assign(window, { pond: { query, pipelinePause, pipelineCancelSave } });
  query.mockImplementation(async (name: string) => {
    if (name === "settings.getPrefs") return {};
    if (name === "pipeline.status") return { paused: false };
    if (name === "pipeline.inflight") return [];
    if (name === "downloads.live") return [];
    if (name === "saves.retryFailed") return { ok: true, requeued: 1 };
    if (name === "saves.getMany") return [];
    throw new Error(`Unexpected query: ${name}`);
  });
  setSaves([
    save("Running video", "ingesting", "running"),
    save("Waiting video", "ingesting", "pending"),
    save("Failed video", "failed", "failed"),
  ]);
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
});
afterEach(async () => {
  await act(async () => {
    root.unmount();
    downloadsSelection.clear();
    setSaves([]);
  });
  client.clear();
  host.remove();
  vi.unstubAllGlobals();
});
async function render() {
  await act(async () =>
    root.render(
      <QueryClientProvider client={client}>
        <Tooltip.Provider>
          <DownloadsPage />
        </Tooltip.Provider>
      </QueryClientProvider>,
    ),
  );
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}
async function click(selector: string, modifiers = {}) {
  const element = document.querySelector(selector);
  if (!element) throw new Error(`Missing ${selector}`);
  await act(async () => {
    element.dispatchEvent(
      new MouseEvent("click", { bubbles: true, ...modifiers }),
    );
  });
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}
it("shows live downloads that paging missed without hydrating the whole library", async () => {
  const queued = save("Old failure", "failed", "failed");
  setSaves([save("Recent clip", "complete")]);
  query.mockImplementation(async (name: string, args?: { ids?: string[] }) => {
    if (name === "settings.getPrefs") return {};
    if (name === "pipeline.status") return { paused: false };
    if (name === "pipeline.inflight") return [];
    if (name === "downloads.live") return [queued.id];
    if (name === "saves.getMany") {
      expect(args?.ids).toEqual([queued.id]);
      return [queued];
    }
    if (name === "saves.list") {
      throw new Error("must not hydrate the full save pool");
    }
    throw new Error(`Unexpected query: ${name}`);
  });
  await render();
  expect(query).toHaveBeenCalledWith("downloads.live", {});
  expect(query).not.toHaveBeenCalledWith("saves.list", expect.anything());
  expect(host.textContent).toContain("Old failure");
  expect(host.querySelector('[aria-label="Open Recent clip"]')).toBeNull();
});

it("keeps running work active when the queue is paused and scopes retry to visible failures", async () => {
  await render();
  expect(host.querySelector('[role="tablist"]')).toBeNull();
  expect(host.querySelector("footer")).toBeNull();
  await click('[aria-label="Pause Queue"]');
  expect(pipelinePause).toHaveBeenCalledWith(true);
  expect(
    host.querySelector('[data-status="running"]')?.hasAttribute("data-moving"),
  ).toBe(true);
  expect(host.querySelector('[data-status="pending"]')?.textContent).toContain(
    "Paused",
  );
  await click('[aria-label="Retry Failed"]');
  expect(query).toHaveBeenCalledWith("saves.retryFailed", {
    ids: ["Failed video"],
  });
  await click('[aria-label="Cancel Running video"]');
  expect(pipelineCancelSave).toHaveBeenCalledWith("Running video");
  expect(primarySelection.get()).toBeNull();
});

it("preserves row selection and prunes completed selections after live updates", async () => {
  await render();
  expect(host.querySelector('[role="checkbox"]')).toBeNull();
  await click('[aria-label="Open Running video"]', { metaKey: true });
  expect(downloadsSelection.size()).toBe(1);
  expect(primarySelection.get()).toBeNull();
  await act(async () =>
    setSaves([
      save("Running video", "complete"),
      save("Failed video", "failed", "failed"),
    ]),
  );
  expect(downloadsSelection.size()).toBe(0);
  await click('[aria-label="Open Failed video"]');
  expect(primarySelection.get()).toBe("Failed video");
});

it("sorts downloads from column headers without selecting or opening a save", async () => {
  await render();
  await click('[aria-label="Sort by Name"]');
  expect(
    [...host.querySelectorAll('button[aria-label^="Open "]')].map((button) =>
      button.getAttribute("aria-label"),
    ),
  ).toEqual(["Open Failed video", "Open Running video", "Open Waiting video"]);
  await click('[aria-label="Sort by Name"]');
  expect(
    [...host.querySelectorAll('button[aria-label^="Open "]')].map((button) =>
      button.getAttribute("aria-label"),
    ),
  ).toEqual(["Open Waiting video", "Open Running video", "Open Failed video"]);
  expect(downloadsSelection.size()).toBe(0);
  expect(primarySelection.get()).toBeNull();
});
