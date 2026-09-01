// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { ReferenceBoard } from "./reference-board";

vi.mock("@/lib/save/ensure-saves", () => ({ ensureSaves: async () => {} }));

it("deduplicates consulted Saves, separates navigation from attachment, and closes", async () => {
  const source = {
    id: "one",
    title: "Texture",
    url: "https://example.com",
    source: "arena",
  };
  const onOpenSave = vi.fn();
  const onAttach = vi.fn();
  const onClose = vi.fn();
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  try {
    await act(async () =>
      root.render(
        <ReferenceBoard
          sources={[source, source]}
          attachedIds={[]}
          onOpenSave={onOpenSave}
          onAttach={onAttach}
          onClose={onClose}
        />,
      ),
    );
    expect(host.querySelectorAll("article")).toHaveLength(1);
    expect(host.textContent).toContain("1 Save consulted");
    expect(document.activeElement).toBe(
      host.querySelector('[aria-label="Close References"]'),
    );
    await act(async () =>
      host
        .querySelector<HTMLButtonElement>('[aria-label="Open Texture"]')
        ?.click(),
    );
    expect(onOpenSave).toHaveBeenCalledExactlyOnceWith("one");
    expect(onAttach).not.toHaveBeenCalled();
    await act(async () =>
      host.querySelector<HTMLButtonElement>("footer button")?.click(),
    );
    expect(onAttach).toHaveBeenCalledExactlyOnceWith([source]);
    await act(async () =>
      host
        .querySelector<HTMLButtonElement>('[aria-label="Close References"]')
        ?.click(),
    );
    expect(onClose).toHaveBeenCalledOnce();
    await act(async () =>
      host
        .querySelector('[aria-label="Open Texture"]')
        ?.dispatchEvent(
          new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
        ),
    );
    expect(onClose).toHaveBeenCalledTimes(2);
  } finally {
    await act(async () => root.unmount());
    host.remove();
  }
});
