import { PrefsSchema } from "@pond/schema";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { pool } from "@/features/saves/state/pool";
import { libraryViewContext } from "@/features/saves/state/view-context";
import type { Save } from "@/features/saves/types";
import { MediaViewer } from "..";

const save: Save = {
  id: "chrome-save",
  source: "web",
  sourceId: "test",
  url: "https://example.test",
  title: "Reference",
  description: null,
  author: null,
  notes: null,
  mediaUrl: null,
  mediaType: "image",
  files: [
    {
      path: "reference.jpg",
      kind: "image",
      size: 1,
      sha256: "fixture",
      width: 800,
      height: 400,
      mimeType: "image/jpeg",
    },
  ],
  tags: [],
  savedAt: 0,
  createdAt: 0,
  deletedAt: null,
};

let host: HTMLDivElement;
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
  vi.stubGlobal("pond", {
    query: async () => PrefsSchema.parse({}),
    tx: async () => ({ ok: true }),
  });
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  pool.upsert(save);
  libraryViewContext.set(["chrome-save", "other"], "library");
});

afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
  libraryViewContext.set([], "library");
});

it("places image inspector controls in the top toolbar", async () => {
  await act(async () => {
    root.render(<MediaViewer save={save} />);
  });
  const frame = host.querySelector("[data-background]");
  const previous = [...host.querySelectorAll("button")].find(
    (button) => button.getAttribute("aria-label") === "Previous Slide",
  );
  const fit = [...host.querySelectorAll("button")].find(
    (button) => button.getAttribute("aria-label") === "Fit",
  );
  expect(host.textContent).not.toContain("1 / 2");
  expect(previous).toBeUndefined();
  expect(fit).toBeTruthy();
  expect(frame?.contains(fit ?? null)).toBe(false);
  expect(fit?.closest("[data-blossom-slide]")).toBeNull();
  expect(fit?.closest("[data-slot]")?.getAttribute("data-slot")).toBe("top");
  expect(host.querySelector("[data-viewer-root]")?.contains(fit ?? null)).toBe(
    true,
  );
});

it("shows only media when controls are disabled", async () => {
  await act(async () => {
    root.render(<MediaViewer save={save} showControls={false} />);
  });

  expect(host.querySelector("[aria-label='Image']")).toBeTruthy();
  expect(host.querySelector("[data-slot]")).toBeNull();
  expect(host.querySelector("[aria-label='Fit']")).toBeNull();
  expect(
    host.querySelector("[data-viewer-root]")?.hasAttribute("data-chrome"),
  ).toBe(false);
});

it("places gallery paging and image controls in the top toolbar", async () => {
  const first = save.files[0];
  if (!first) throw new Error("Missing fixture file");
  const gallery: Save = {
    ...save,
    id: "gallery-save",
    files: [
      first,
      {
        ...first,
        path: "second.jpg",
        sha256: "fixture-2",
      },
    ],
  };
  pool.upsert(gallery);
  await act(async () => {
    root.render(<MediaViewer save={gallery} />);
  });
  const labeled = (label: string) =>
    [...host.querySelectorAll("button")].find(
      (button) => button.getAttribute("aria-label") === label,
    );
  const previous = labeled("Previous Slide");
  const next = labeled("Next Slide");
  const zoom = labeled("Zoom In");
  const crop = labeled("Crop");
  expect(host.textContent).toContain("1 / 2");
  expect(previous?.disabled).toBe(true);
  expect(next?.disabled).toBe(false);
  expect(previous?.closest("[data-slot]")?.getAttribute("data-slot")).toBe(
    "top",
  );
  expect(crop?.closest("[data-slot]")?.getAttribute("data-slot")).toBe("top");
  expect(zoom?.closest("[data-slot]")?.getAttribute("data-slot")).toBe("top");
  expect(host.querySelectorAll("[aria-label='Previous Slide']")).toHaveLength(
    1,
  );
  expect(previous?.closest("[data-blossom-slide]")).toBeNull();
  expect(crop?.closest("[data-blossom-slide]")).toBeNull();
  expect(zoom?.closest("[data-blossom-slide]")).toBeNull();
});
