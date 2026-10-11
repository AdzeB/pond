import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ImageControls } from ".";

describe("image inspector toolbar", () => {
  let host: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    host.remove();
  });

  it("shows the compact image action sequence at the small size", async () => {
    const noop = vi.fn();
    await act(async () =>
      root.render(
        <ImageControls.Hud
          actual={1}
          active
          busy={false}
          canCrop={false}
          itemIndex={0}
          itemTotal={493}
          mode="view"
          onActualSize={noop}
          onApplyCrop={noop}
          onCancelCrop={noop}
          onFit={noop}
          onFlip={noop}
          onRotate={noop}
          onSaveCrop={noop}
          onToggleCrop={noop}
          onZoomIn={noop}
          onZoomOut={noop}
          onZoomRatio={noop}
        />,
      ),
    );

    const labels = [...host.querySelectorAll("button")]
      .map((button) => button.getAttribute("aria-label"))
      .filter((label): label is string => label !== null);
    expect(labels).toEqual([
      "Zoom Out",
      "Zoom Ratio",
      "Zoom In",
      "Flip",
      "Rotate",
      "Crop",
      "Actual Size",
      "Fit to Window",
    ]);
    expect(host.textContent).toContain("1 / 493");
    expect(host.querySelector('[aria-label="Previous Item"]')).toBeNull();
    expect(host.querySelector('[aria-label="Next Item"]')).toBeNull();
    expect(host.querySelectorAll('[role="separator"]')).toHaveLength(0);

    for (const label of labels) {
      const button = host.querySelector<HTMLButtonElement>(
        `button[aria-label="${label}"]`,
      );
      expect(button, label).not.toBeNull();
      expect(button?.dataset.size, label).toBe("sm");
    }
  });

  it("adds slide arrows after the image actions only for multiple slides", async () => {
    const noop = vi.fn();
    const onNext = vi.fn();
    const onPrevious = vi.fn();
    await act(async () =>
      root.render(
        <ImageControls.Hud
          actual={1}
          active
          busy={false}
          canCrop={false}
          itemIndex={0}
          itemTotal={493}
          mode="view"
          slideNavigation={{
            index: 0,
            count: 2,
            onNext,
            onPrevious,
          }}
          onActualSize={noop}
          onApplyCrop={noop}
          onCancelCrop={noop}
          onFit={noop}
          onFlip={noop}
          onRotate={noop}
          onSaveCrop={noop}
          onToggleCrop={noop}
          onZoomIn={noop}
          onZoomOut={noop}
          onZoomRatio={noop}
        />,
      ),
    );

    const previous = host.querySelector<HTMLButtonElement>(
      '[aria-label="Previous Slide"]',
    );
    const next = host.querySelector<HTMLButtonElement>(
      '[aria-label="Next Slide"]',
    );
    expect(previous?.disabled).toBe(true);
    expect(next?.disabled).toBe(false);
    expect(
      previous?.parentElement?.previousElementSibling?.getAttribute("role"),
    ).toBe("separator");
    expect(host.querySelectorAll('[role="separator"]')).toHaveLength(1);
    expect(
      [...host.querySelectorAll("button")]
        .map((button) => button.getAttribute("aria-label"))
        .filter((label): label is string => label !== null)
        .slice(-3),
    ).toEqual(["Fit to Window", "Previous Slide", "Next Slide"]);
    await act(async () => next?.click());
    expect(onNext).toHaveBeenCalledOnce();
  });

  it("adds GIF Frames without adding a separator", async () => {
    const noop = vi.fn();
    await act(async () =>
      root.render(
        <ImageControls.Hud
          actual={1}
          active
          busy={false}
          canCrop={false}
          itemIndex={0}
          itemTotal={1}
          isGif
          gifFramesOpen
          mode="view"
          onActualSize={noop}
          onApplyCrop={noop}
          onCancelCrop={noop}
          onFit={noop}
          onFlip={noop}
          onRotate={noop}
          onSaveCrop={noop}
          onToggleCrop={noop}
          onToggleGifFrames={noop}
          onZoomIn={noop}
          onZoomOut={noop}
          onZoomRatio={noop}
        />,
      ),
    );

    expect(host.querySelector('[aria-label="GIF Frames"]')).not.toBeNull();
    expect(host.querySelectorAll('[role="separator"]')).toHaveLength(0);
  });

  it("keeps view controls but hides destructive edits when edits are disabled", async () => {
    const noop = vi.fn();
    await act(async () =>
      root.render(
        <ImageControls.Hud
          actual={1}
          active
          busy={false}
          canCrop={false}
          edits="none"
          itemIndex={0}
          itemTotal={1}
          mode="view"
          onActualSize={noop}
          onApplyCrop={noop}
          onCancelCrop={noop}
          onFit={noop}
          onFlip={noop}
          onRotate={noop}
          onSaveCrop={noop}
          onToggleCrop={noop}
          onZoomIn={noop}
          onZoomOut={noop}
          onZoomRatio={noop}
        />,
      ),
    );

    const labeled = (label: string) =>
      host.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);
    expect(labeled("Actual Size")).not.toBeNull();
    expect(labeled("Fit to Window")).not.toBeNull();
    expect(labeled("Flip")).toBeNull();
    expect(labeled("Rotate")).toBeNull();
    expect(labeled("Crop")).toBeNull();
  });
});
