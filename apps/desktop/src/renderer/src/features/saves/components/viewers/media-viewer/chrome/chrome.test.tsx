// @vitest-environment jsdom
import { PrefsSchema } from "@pond/schema";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { libraryViewContext } from "@/features/library/state/library-view-context";
import { pool } from "@/features/saves/state/pool";
import type { Save } from "@/features/saves/types";
import { MediaViewer } from "../media-viewer";

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
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
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

it("floats image inspector controls over the viewer stage", async () => {
  await act(async () => {
    root.render(<MediaViewer save={save} />);
  });
  const frame = host.querySelector("[data-background]");
  const previous = [...host.querySelectorAll("button")].find(
    (button) => button.getAttribute("aria-label") === "Previous",
  );
  const fit = [...host.querySelectorAll("button")].find(
    (button) => button.getAttribute("aria-label") === "Fit",
  );
  expect(host.textContent).not.toContain("1 / 2");
  expect(previous).toBeUndefined();
  expect(fit).toBeTruthy();
  expect(frame?.contains(fit ?? null)).toBe(false);
  expect(host.querySelector("[data-viewer-root]")?.contains(fit ?? null)).toBe(
    true,
  );
});
