// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Save } from "@/lib/types";
import { Card } from ".";

vi.mock("@/hooks/use-media-pick-options", () => ({
  useMediaPickOptions: () => ({}),
}));

vi.mock("@/stores/display-prefs", () => ({
  useDisplayPref: (key: string) => key === "source",
}));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let root: Root | null = null;
let container: HTMLDivElement | null = null;

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
});

function save(source: Save["source"]): Save {
  return {
    id: `${source}-save`,
    source,
    sourceId: `${source}-save`,
    url: "",
    title: null,
    description: null,
    author: null,
    notes: null,
    mediaUrl: null,
    mediaType: null,
    files: [],
    tags: [],
    savedAt: 0,
    createdAt: 0,
    deletedAt: null,
  };
}

describe("Save card source badge", () => {
  it("omits the redundant source badge for local Saves", () => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);

    act(() => {
      root?.render(<Card.Overlay save={save("local")} primary={null} />);
    });

    expect(container.querySelector('[aria-label^="Saved from"]')).toBeNull();
  });

  it("keeps the source badge for non-local Saves", () => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);

    act(() => {
      root?.render(<Card.Overlay save={save("web")} primary={null} />);
    });

    expect(
      container.querySelector('[aria-label="Saved from Web"]'),
    ).not.toBeNull();
  });
});
