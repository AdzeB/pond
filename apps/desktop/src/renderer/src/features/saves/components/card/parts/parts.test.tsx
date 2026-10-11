import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import type { SaveCardOverlayModel } from "@/features/saves/components/card/model";
import { Card } from "./";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let root: Root | null = null;
let container: HTMLDivElement | null = null;

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
});

const emptyOverlay: SaveCardOverlayModel = {
  type: null,
  source: null,
  fileCount: null,
};

describe("Save card source badge", () => {
  it("omits a source badge when the model has none", () => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);

    act(() => {
      root?.render(<Card.Overlay model={emptyOverlay} />);
    });

    expect(container.querySelector('[aria-label^="Saved from"]')).toBeNull();
  });

  it("renders source details from the presentation model", () => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);

    act(() => {
      root?.render(
        <Card.Overlay
          model={{
            ...emptyOverlay,
            source: { label: "Web", logo: null, icon: null },
          }}
        />,
      );
    });

    expect(
      container.querySelector('[aria-label="Saved from Web"]'),
    ).not.toBeNull();
  });
});
