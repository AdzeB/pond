import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "@/app/effects/save-library-bridge";
import type { Save } from "@/features/saves/types";
import { KebabMenu } from "./kebab";

const save: Save = {
  id: "open-save",
  source: "local",
  sourceId: "open-save",
  url: "pond:local/open-save",
  title: "Open Save",
  description: null,
  author: null,
  notes: null,
  mediaUrl: null,
  mediaType: "file",
  files: [
    {
      kind: "file",
      path: "open-save.pdf",
      mimeType: "application/pdf",
      sha256: "abc",
      size: 1,
    },
  ],
  tags: [],
  savedAt: 0,
  createdAt: 0,
  deletedAt: null,
};

describe("KebabMenu", () => {
  let host: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
    vi.stubGlobal("pond", {
      query: async () => ({ apps: [] }),
    });
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    host.remove();
    vi.unstubAllGlobals();
  });

  it("hides Open Save in an open save detail", async () => {
    await act(async () => root.render(<KebabMenu save={save} />));
    const trigger = document.querySelector('[aria-label="Save Actions"]');
    if (!(trigger instanceof HTMLElement)) throw new Error("Missing trigger");

    await act(async () => {
      trigger.click();
      await Promise.resolve();
    });
    const open = Array.from(
      document.querySelectorAll('[role="menuitem"]'),
    ).find((item) => item.textContent?.startsWith("Open"));
    if (!(open instanceof HTMLElement)) throw new Error("Missing Open menu");

    await act(async () => {
      open.click();
      await Promise.resolve();
    });

    expect(document.body.textContent).not.toContain("Open Save");
    expect(document.body.textContent).toContain("Open with Default App");
  });
});
