// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { CollectShell } from "./collect-shell";

it("imports a dropped file using the preload path resolver", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const query = vi.fn().mockResolvedValue([]);
  const file = new File(["image"], "drop.png", { type: "image/png" });
  const pathForFile = vi.fn().mockReturnValue("/tmp/drop.png");
  vi.stubGlobal("pond", { query, pathForFile });
  const host = document.createElement("div");
  const root = createRoot(host);
  try {
    await act(async () => root.render(<CollectShell />));
    const target = [...host.querySelectorAll("div")].find(
      (node) => node.textContent === "Drop files",
    );
    expect(target).toBeDefined();
    const event = new Event("drop", { bubbles: true, cancelable: true });
    Object.defineProperty(event, "dataTransfer", { value: { files: [file] } });
    await act(async () => {
      target?.dispatchEvent(event);
    });
    expect(query).toHaveBeenCalledWith("captures.accept", {
      draft: expect.objectContaining({
        mode: "quick",
        items: [{ kind: "file", path: "/tmp/drop.png" }],
        metadata: expect.objectContaining({ tags: [], folderIds: [] }),
      }),
    });
  } finally {
    await act(async () => root.unmount());
    vi.unstubAllGlobals();
  }
});

it("opens the newest draft and shows its page assets", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  const query = vi.fn(async (name: string, input?: { id?: string }) => {
    if (name === "captures.list")
      return [
        {
          id: "old",
          state: "complete",
          total: 1,
          completed: 1,
          duplicateCount: 0,
        },
        {
          id: "new",
          state: "draft",
          total: 2,
          completed: 0,
          duplicateCount: 0,
        },
      ];
    if (name === "folders.list") return [{ id: "refs", name: "Refs" }];
    if (name === "captures.draft" && input?.id === "new")
      return {
        id: "new",
        mode: "collect",
        items: [
          { kind: "asset", url: "https://cdn.example/one.jpg" },
          { kind: "asset", url: "https://cdn.example/two.jpg" },
        ],
        metadata: { tags: ["page-asset"], folderIds: [] },
      };
    return { ok: true };
  });
  vi.stubGlobal("pond", { query });
  const host = document.createElement("div");
  const root = createRoot(host);
  try {
    await act(async () => root.render(<CollectShell />));
    await act(async () => {});
    expect(query).toHaveBeenCalledWith("captures.draft", { id: "new" });
    const images = [...host.querySelectorAll("img")].map((node) => node.src);
    expect(images).toEqual([
      "https://cdn.example/one.jpg",
      "https://cdn.example/two.jpg",
    ]);
    expect(host.textContent).toContain("2 images");
  } finally {
    await act(async () => root.unmount());
    vi.unstubAllGlobals();
  }
});

it("loads only one draft at a time and sends its edited metadata before saving", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  const draft = {
    id: "one",
    mode: "collect",
    items: [{ kind: "url", url: "https://fixture.test" }],
    metadata: {
      title: "Reference",
      notes: "Original note",
      rating: 3,
      tags: ["design"],
      folderIds: ["references"],
    },
  };
  let release = () => {};
  const deferred = new Promise<typeof draft>((resolve) => {
    release = () => resolve(draft);
  });
  const query = vi.fn(async (name: string) => {
    if (name === "captures.list")
      return ["two", "one"].map((id) => ({
        id,
        state: "draft",
        total: 1,
        completed: 0,
        duplicateCount: 0,
      }));
    if (name === "folders.list")
      return [{ id: "references", name: "References" }];
    if (name === "captures.draft") return deferred;
    return { ok: true };
  });
  vi.stubGlobal("pond", { query });
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  const button = (label: string) =>
    [...host.querySelectorAll("button")].find(
      (node) => node.textContent === label,
    );
  try {
    await act(async () => root.render(<CollectShell />));
    await act(async () => {
      const buttons = [...host.querySelectorAll("button")].filter(
        (node) => node.textContent === "Categorize",
      );
      buttons[0]?.click();
      buttons[1]?.click();
    });
    expect(
      query.mock.calls.filter(([name]) => name === "captures.draft"),
    ).toHaveLength(1);
    await act(async () => release());
    const inputs = host.querySelectorAll("input");
    expect(inputs[0]?.value).toBe("Reference");
    const title = inputs[0];
    if (!title) throw new Error("Missing capture title");
    await act(async () => {
      Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      )?.set?.call(title, "Edited reference");
      title.dispatchEvent(new Event("input", { bubbles: true }));
      title.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await act(async () => {
      button("Save capture")?.click();
      button("Save capture")?.click();
    });
    expect(
      query.mock.calls.filter(([name]) => name === "captures.resume"),
    ).toHaveLength(1);
    expect(query).toHaveBeenCalledWith("captures.resume", {
      id: "one",
      metadata: { ...draft.metadata, title: "Edited reference" },
    });
    expect(host.textContent).toContain("Capture queued");
  } finally {
    await act(async () => root.unmount());
    host.remove();
    vi.unstubAllGlobals();
  }
});

it("shows screenshot failures and keeps cancelled capture quiet", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const query = vi.fn(async (name: string) => {
    if (name === "capture.display")
      return { ok: false, error: "capture_failed" };
    if (name === "capture.window") return { ok: false, error: "cancelled" };
    if (name === "capture.selectArea")
      throw new Error("Screen access unavailable");
    return [];
  });
  vi.stubGlobal("pond", { query });
  const host = document.createElement("div");
  const root = createRoot(host);
  const button = (label: string) =>
    [...host.querySelectorAll("button")].find(
      (node) => node.textContent === label,
    );
  try {
    await act(async () => root.render(<CollectShell />));
    await act(async () => button("Screenshot Display")?.click());
    expect(host.querySelector('[role="alert"]')?.textContent).toContain(
      "Couldn’t take the screenshot",
    );
    await act(async () => button("Screenshot Window")?.click());
    expect(host.querySelector('[role="alert"]')).toBeNull();
    await act(async () => button("Screenshot Area")?.click());
    expect(host.querySelector('[role="alert"]')?.textContent).toContain(
      "Screen access unavailable",
    );
  } finally {
    await act(async () => root.unmount());
    vi.unstubAllGlobals();
  }
});
