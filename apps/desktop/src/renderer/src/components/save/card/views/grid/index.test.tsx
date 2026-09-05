// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { SaveCardModel } from "@/components/save/card/model";
import type { Save } from "@/lib/types";
import { GridCard } from ".";

vi.mock("@/components/save/card/media", () => ({
  PreparedCardThumb: () => <div data-preview="" />,
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

describe("GridCard", () => {
  it("fits the preview inside a separate badge container", () => {
    const model: SaveCardModel = {
      save: {} as Save,
      unit: null,
      primary: null,
      mediaUnits: [],
      pickOptions: {},
      aspect: 0.5,
      title: null,
      time: null,
      overlay: {
        type: { label: "PNG", kind: "image" },
        source: null,
        fileCount: null,
        hasNote: false,
      },
    };
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);

    act(() => root?.render(<GridCard model={model} width={200} />));

    const preview = container.querySelector<HTMLElement>("[data-preview]");
    const frame = preview?.parentElement;
    const badge = container.querySelector('[aria-label="Type: PNG"]');
    const overlay = badge?.parentElement;
    const media = overlay?.parentElement;

    expect(frame?.style.getPropertyValue("--frame-aspect")).toBe("0.5");
    expect(frame?.style.getPropertyValue("--frame-width")).toBe("50%");
    expect(frame?.parentElement).toBe(media);
    expect(overlay?.previousElementSibling).toBe(frame);
    expect(frame?.contains(overlay ?? null)).toBe(false);
  });
});
