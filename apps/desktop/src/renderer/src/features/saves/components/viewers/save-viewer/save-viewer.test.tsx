import { PrefsSchema } from "@pond/schema";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { pool } from "@/features/saves/state/pool";
import { resultNavigation } from "@/features/saves/state/result-navigation";
import type { Save, SaveFile } from "@/features/saves/types";
import { SaveViewer } from ".";

function file(path: string, kind: string, mimeType: string): SaveFile {
  return { path, kind, mimeType, sha256: `fixture-${path}`, size: 1 };
}

function mixedSave(files: SaveFile[]): Save {
  return {
    id: "mixed-viewer",
    source: "local",
    sourceId: "mixed-viewer",
    url: "https://example.test/mixed-viewer",
    title: "Mixed viewer",
    description: null,
    author: null,
    notes: null,
    mediaUrl: null,
    mediaType: "file",
    files,
    tags: [],
    savedAt: 0,
    createdAt: 0,
    deletedAt: null,
  };
}

function labeledButton(host: HTMLElement, label: string): HTMLButtonElement {
  const button = host.querySelector<HTMLButtonElement>(
    `button[aria-label="${label}"]`,
  );
  if (!button) throw new Error(`Missing ${label} button`);
  return button;
}

async function click(host: HTMLElement, label: string): Promise<void> {
  await act(async () => labeledButton(host, label).click());
}

async function findToolbar(host: HTMLElement, label: string): Promise<void> {
  await vi.waitFor(() => {
    if (!host.querySelector(`[role="toolbar"][aria-label="${label}"]`))
      throw new Error(`Missing ${label} toolbar`);
  });
}

describe("SaveViewer", () => {
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
    vi.stubGlobal("matchMedia", () => ({ matches: true }));
    vi.stubGlobal("fetch", async () => {
      throw new Error("Offline fixture");
    });
    vi.stubGlobal(
      "FontFace",
      class {
        async load() {
          return this;
        }
      },
    );
    Object.defineProperty(document, "fonts", {
      configurable: true,
      value: { add() {}, delete() {} },
    });
    vi.stubGlobal("pond", {
      openSaveFile: async () => ({ ok: true }),
      query: async () => PrefsSchema.parse({}),
      tx: async () => ({ ok: true }),
    });
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    host.remove();
    resultNavigation.setSource({ ids: [] });
    vi.unstubAllGlobals();
  });

  it("navigates every original file in a mixed-format Save", async () => {
    const save = mixedSave([
      file("reference.jpg", "image", "image/jpeg"),
      file("reference.pdf", "file", "application/pdf"),
      file("reference.woff2", "file", "font/woff2"),
    ]);
    pool.upsert(save);
    resultNavigation.setSource({ ids: [save.id], total: 1 });

    await act(async () => root.render(<SaveViewer save={save} />));

    expect(host.querySelector('img[alt="Mixed viewer"]')).not.toBeNull();
    expect(host.querySelectorAll("[data-viewer-root]")).toHaveLength(1);
    expect(host.querySelectorAll('[role="separator"]')).toHaveLength(1);
    expect(labeledButton(host, "Previous Slide").disabled).toBe(true);

    await click(host, "Next Slide");
    await findToolbar(host, "PDF");
    expect(host.querySelectorAll("[data-viewer-root]")).toHaveLength(1);
    expect(host.querySelectorAll('[role="separator"]')).toHaveLength(1);

    await click(host, "Next Slide");
    await findToolbar(host, "Font");
    expect(labeledButton(host, "Next Slide").disabled).toBe(true);
    expect(host.querySelectorAll("[data-viewer-root]")).toHaveLength(1);
    expect(host.querySelectorAll('[role="separator"]')).toHaveLength(1);
  });

  it("keeps later image and font originals reachable when PDF is first", async () => {
    const save = mixedSave([
      file("reference.pdf", "file", "application/pdf"),
      file("reference.jpg", "image", "image/jpeg"),
      file("reference.woff2", "file", "font/woff2"),
    ]);
    pool.upsert(save);
    resultNavigation.setSource({ ids: [save.id], total: 1 });

    await act(async () => root.render(<SaveViewer save={save} />));

    await findToolbar(host, "PDF");
    await click(host, "Next Slide");
    expect(host.querySelector('img[alt="Mixed viewer"]')).not.toBeNull();
    await click(host, "Next Slide");
    await findToolbar(host, "Font");
  });
});
