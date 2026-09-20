import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ScreenshotDialog } from ".";

describe("screenshot dialog", () => {
  let host: HTMLDivElement;
  let root: Root;
  const query = vi.fn();
  const onClose = vi.fn();
  const onCapture = vi.fn(async () => {});

  beforeEach(() => {
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
    vi.stubGlobal("pond", { query });
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
    query.mockReset();
    onClose.mockReset();
    onCapture.mockClear();
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    host.remove();
    vi.unstubAllGlobals();
  });

  it("requires a selected source and passes it to the capture action", async () => {
    query.mockImplementation(async (name: string) => {
      if (name === "saves.desktopScreenshotSources") {
        return {
          sources: [
            {
              id: "window:8:0",
              name: "Browser",
              kind: "window",
              thumbnailDataUrl: "data:image/png;base64,cG5n",
            },
          ],
        };
      }
      return { ok: true, id: "screenshot-1" };
    });
    await act(async () =>
      root.render(
        <ScreenshotDialog open onClose={onClose} onCapture={onCapture} />,
      ),
    );
    await act(async () => {});

    const capture = [...document.querySelectorAll("button")].find(
      (button) => button.textContent?.trim() === "Capture",
    );
    if (!capture) throw new Error("Missing Capture button");
    expect(capture.disabled).toBe(true);

    const source = [...document.querySelectorAll("button")].find((button) =>
      button.textContent?.includes("Browser"),
    );
    if (!source) throw new Error("Missing source");
    await act(async () => source.click());
    expect(capture.disabled).toBe(false);
    await act(async () => capture.click());
    await act(async () => {});

    expect(onCapture).toHaveBeenCalledWith("window:8:0", {
      title: null,
      tags: [],
      format: "png",
      quality: 90,
      crop: null,
      copyToClipboard: false,
    });
    expect(onClose).toHaveBeenCalledOnce();
  });
});
