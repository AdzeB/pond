// @vitest-environment jsdom
import { Tooltip } from "@pond/ui";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { downloadsSelection } from "@/features/downloads/state/downloads-selection";
import { libraryChrome } from "@/features/library/state/library-chrome";
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
            attempts: taskStatus === "pending" ? 0 : 1,
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
  libraryChrome.inspectSave(null);
  libraryChrome.closeRightPane();
  Object.assign(window, { pond: { query, pipelinePause, pipelineCancelSave } });
  query.mockImplementation(async (name: string) => {
    if (name === "settings.getPrefs") return {};
    if (name === "downloads.activity") return [];
    if (name === "downloads.history") return { rows: [], nextCursor: null };
    if (name === "pipeline.status") return { paused: false };
    if (name === "pipeline.inflight") return [];
    if (name === "downloads.ingestingOrFailed") return [];
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
    if (name === "downloads.activity") return [];
    if (name === "downloads.history") return { rows: [], nextCursor: null };
    if (name === "pipeline.status") return { paused: false };
    if (name === "pipeline.inflight") return [];
    if (name === "downloads.ingestingOrFailed") return [queued.id];
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
  expect(query).toHaveBeenCalledWith("downloads.ingestingOrFailed", {});
  expect(query).not.toHaveBeenCalledWith("saves.list", expect.anything());
  expect(host.textContent).toContain("Old failure");
  expect(host.querySelector('[aria-label="Inspect Recent clip"]')).toBeNull();
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
  const pausedGroup = [...host.querySelectorAll("button")].find(
    (button) => button.textContent?.replaceAll(" ", "") === "Paused1",
  );
  if (!pausedGroup) throw new Error("Missing paused group");
  await act(async () => pausedGroup.click());
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
  await click('[aria-label="Inspect Running video"]', { metaKey: true });
  expect(downloadsSelection.size()).toBe(1);
  expect(primarySelection.get()).toBeNull();
  await act(async () =>
    setSaves([
      save("Running video", "complete"),
      save("Failed video", "failed", "failed"),
    ]),
  );
  expect(downloadsSelection.size()).toBe(0);
  await click('[aria-label="Inspect Failed video"]');
  expect(primarySelection.get()).toBeNull();
  expect(libraryChrome.getState()).toMatchObject({
    inspectorSaveId: "Failed video",
    inspectorMode: "download",
    rightPane: "inspector",
  });
});

it("keeps waiting names collapsed and sorts only active work", async () => {
  setSaves([
    save("Z clip", "ingesting", "running"),
    save("A clip", "ingesting", "running"),
    save("Waiting video", "ingesting", "pending"),
  ]);
  await render();
  expect(host.querySelector('[aria-label="Inspect Waiting video"]')).toBeNull();
  await click('[aria-label="Sort by Name"]');
  expect(
    [...host.querySelectorAll('button[aria-label^="Inspect "]')].map((button) =>
      button.getAttribute("aria-label"),
    ),
  ).toEqual(["Inspect A clip", "Inspect Z clip"]);
  await click('[aria-label="Sort by Name"]');
  expect(
    [...host.querySelectorAll('button[aria-label^="Inspect "]')].map((button) =>
      button.getAttribute("aria-label"),
    ),
  ).toEqual(["Inspect Z clip", "Inspect A clip"]);
  expect(downloadsSelection.size()).toBe(0);
  expect(primarySelection.get()).toBeNull();
});

it("opens completed history on demand without filling the active list", async () => {
  query.mockImplementation(async (name: string) => {
    if (name === "settings.getPrefs") return {};
    if (name === "pipeline.status") return { paused: false };
    if (
      name === "downloads.activity" ||
      name === "downloads.ingestingOrFailed" ||
      name === "pipeline.inflight"
    )
      return [];
    if (name === "downloads.history")
      return {
        rows: [
          {
            id: 1,
            saveId: "done",
            title: "Saved clip",
            url: "https://example.com/done",
            source: "youtube",
            outcome: "complete",
            durationMs: 3000,
            attempts: 1,
            failedOp: null,
            error: null,
            ts: 1000,
          },
        ],
        nextCursor: null,
      };
    throw new Error(`Unexpected query: ${name}`);
  });
  await render();
  expect(host.querySelector('[aria-label="Inspect Saved clip"]')).toBeNull();
  const completed = [...host.querySelectorAll("button")].find(
    (button) => button.textContent === "Completed1",
  );
  if (!completed) throw new Error("Missing completed group");
  await act(async () => completed.click());
  await click('[aria-label="Inspect Saved clip"]');
  expect(libraryChrome.getState()).toMatchObject({
    inspectorSaveId: "done",
    inspectorMode: "download",
  });
});
