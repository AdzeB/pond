// @vitest-environment jsdom
import { PrefsSchema } from "@pond/schema";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { resultNavigation } from "@/features/library/state/result-navigation";
import { selection } from "@/features/library/state/selection";
import { pool } from "@/features/saves/state/pool";
import type { Save } from "@/features/saves/types";
import { Presentation } from "./presentation";

const first: Save = {
  id: "presentation-first",
  source: "web",
  sourceId: "first",
  url: "https://example.test",
  title: "First image",
  description: null,
  author: null,
  notes: null,
  mediaUrl: null,
  mediaType: "image",
  files: [
    {
      kind: "image",
      sha256: "fixture",
      size: 100,
      path: "reference.png",
      mimeType: "image/png",
      width: 100,
      height: 100,
    },
  ],
  tags: [],
  savedAt: 0,
  createdAt: 0,
  deletedAt: null,
};
const second: Save = {
  ...first,
  id: "presentation-second",
  title: "Second save",
  description: "A text reference",
  files: [],
  mediaType: "text",
};
let host: HTMLDivElement;
let root: Root;
const closed = vi.fn();
const reveal = vi.fn();
let unsubscribe: () => void;
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
  pool.upsert(first);
  pool.upsert(second);
  selection.setAnchor(first.id);
  resultNavigation.setSource({
    ids: [first.id],
    allIds: async () => [first.id, second.id],
  });
  unsubscribe = resultNavigation.registerReveal(reveal);
  closed.mockClear();
  reveal.mockClear();
});
afterEach(async () => {
  await act(async () => root.unmount());
  unsubscribe();
  resultNavigation.setSource({ ids: [] });
  host.remove();
  vi.unstubAllGlobals();
});
function button(label: string): HTMLButtonElement {
  const node = [...document.querySelectorAll("button")].find(
    (button) =>
      button.textContent === label ||
      button.getAttribute("aria-label") === label,
  );
  if (!node) throw new Error(`Missing button ${label}`);
  return node;
}
it("shares image controls, advances beyond loaded grid rows, and restores selection on close", async () => {
  await act(async () => root.render(<Presentation onClose={closed} />));
  expect(button("Fit")).toBeTruthy();
  await act(async () => button("Zoom In").click());
  expect(document.body.textContent).toContain("125%");
  await act(async () => button("Next").click());
  expect(document.body.textContent).toContain("Second save");
  expect(document.body.textContent).toContain("A text reference");
  await act(async () => button("Close").click());
  expect(closed).toHaveBeenCalledOnce();
  expect(selection.getAnchor()).toBe(second.id);
  expect(reveal).toHaveBeenCalledWith(second.id);
});
