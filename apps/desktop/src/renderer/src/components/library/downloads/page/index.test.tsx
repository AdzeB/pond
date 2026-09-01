// @vitest-environment jsdom
import { Tooltip } from "@pond/ui";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { Save } from "@/lib/types";
import { openSave } from "@/lib/ui/save-nav";
import { downloadsSelection } from "@/stores/downloads-selection";
import { savesStore } from "@/stores/pool";
import { DownloadsPage } from ".";

vi.mock("@/hooks/use-media-pick-options", () => ({
  useMediaPickOptions: () => ({ theme: "light" }),
}));
vi.mock("@/components/library/dock/confirm", () => ({
  openTrayConfirm: vi.fn(),
}));
vi.mock("@/lib/ui/save-nav", () => ({ openSave: vi.fn() }));
vi.mock("@/components/library/empty", () => ({
  DownloadsEmpty: () => <p>No downloads</p>,
  MatchesEmpty: () => <p>No matches</p>,
}));

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
const historyRow = {
  id: 1,
  saveId: "saved",
  title: "Previously saved",
  url: "https://example.com/saved",
  source: "youtube",
  outcome: "complete",
  durationMs: 800,
  attempts: 1,
  failedOp: null,
  error: null,
  ts: 1,
};
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
  Object.assign(window, { pond: { query, pipelinePause, pipelineCancelSave } });
  query.mockImplementation(async (name: string) => {
    if (name === "pipeline.status") return { paused: false };
    if (name === "downloads.history")
      return { rows: [historyRow], nextCursor: null };
    if (name === "saves.retryFailed") return { ok: true, requeued: 1 };
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
async function status(label: string) {
  await click('[aria-label="Download Status"]');
  const option = [...document.querySelectorAll('[role="option"]')].find(
    (node) => node.textContent === label,
  );
  if (!option)
    throw new Error(`Missing status ${label}: ${document.body.textContent}`);
  await act(async () => {
    option.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true }));
    option.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 1 }));
  });
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

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
  expect(openSave).not.toHaveBeenCalled();
});

it("loads history through filters, refreshes completed work, and retains filters when collapsed", async () => {
  await render();
  expect(query.mock.calls.some(([name]) => name === "downloads.history")).toBe(
    false,
  );
  await click('[aria-label="Filter Downloads"]');
  await status("Saved");
  expect(host.textContent).toContain("Previously saved");
  expect(host.querySelector('[aria-label="Open Running video"]')).toBeNull();
  query.mockClear();
  await act(async () =>
    setSaves([
      save("Waiting video", "ingesting", "pending"),
      save("Failed video", "failed", "failed"),
    ]),
  );
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  expect(query).toHaveBeenCalledWith("downloads.history", expect.any(Object));
  await status("All Downloads");
  expect(host.textContent).toContain("Previously saved");
  expect(host.textContent).toContain("Waiting video");
  await click('[aria-label="Filter Downloads (Active)"]');
  expect(host.querySelector("fieldset")?.hidden).toBe(true);
  expect(
    host.querySelector('[aria-label="Filter Downloads (Active)"]'),
  ).not.toBeNull();
});

it("preserves row selection and prunes completed selections after live updates", async () => {
  await render();
  await click('[aria-label="Open Running video"]', { metaKey: true });
  expect(downloadsSelection.size()).toBe(1);
  expect(openSave).not.toHaveBeenCalled();
  await act(async () =>
    setSaves([
      save("Running video", "complete"),
      save("Failed video", "failed", "failed"),
    ]),
  );
  expect(downloadsSelection.size()).toBe(0);
  await click('[aria-label="Open Failed video"]');
  expect(openSave).toHaveBeenCalledWith("Failed video");
});

it("offers a retry when history fails instead of showing an empty result", async () => {
  const original = query.getMockImplementation();
  let failHistory = true;
  query.mockImplementation(async (name: string, args: unknown) => {
    if (name === "downloads.history" && failHistory) throw new Error("offline");
    return original?.(name, args);
  });
  await render();
  await click('[aria-label="Filter Downloads"]');
  await status("Saved");
  expect(host.querySelector('[role="alert"]')?.textContent).toContain(
    "Couldn't load download history",
  );
  failHistory = false;
  await click('[role="alert"] button');
  expect(host.textContent).toContain("Previously saved");
});

it("keeps pagination reachable when the first history page is hidden by a live retry", async () => {
  const original = query.getMockImplementation();
  const cursor = { ts: 1, id: 1 };
  query.mockImplementation(async (name: string, args: { cursor?: unknown }) => {
    if (name !== "downloads.history") return original?.(name, args);
    return args.cursor
      ? { rows: [historyRow], nextCursor: null }
      : {
          rows: [{ ...historyRow, saveId: "Running video" }],
          nextCursor: cursor,
        };
  });
  await render();
  await click('[aria-label="Filter Downloads"]');
  await status("Saved");
  expect(host.textContent).not.toContain("No matches");
  const load = [...host.querySelectorAll("button")].find(
    (button) => button.textContent === "Load More",
  );
  expect(load).toBeDefined();
  await act(async () => load?.click());
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  expect(query).toHaveBeenCalledWith(
    "downloads.history",
    expect.objectContaining({ cursor }),
  );
  expect(host.textContent).toContain("Previously saved");
});
