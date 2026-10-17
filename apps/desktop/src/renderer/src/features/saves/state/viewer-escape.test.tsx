import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { useViewerEscapeLayer, viewerEscape } from "./viewer-escape";

function Layer({ enabled, cancel }: { enabled: boolean; cancel: () => void }) {
  useViewerEscapeLayer(enabled, cancel);
  return null;
}

it("cancels the newest in-progress action first and then lets Esc fall through", async () => {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  const outer = vi.fn();
  const inner = vi.fn();
  const idle = vi.fn();
  try {
    await act(async () =>
      root.render(
        <>
          <Layer enabled cancel={outer} />
          <Layer enabled cancel={inner} />
          <Layer enabled={false} cancel={idle} />
        </>,
      ),
    );
    expect(viewerEscape.cancel()).toBe(true);
    expect(inner).toHaveBeenCalledOnce();
    expect(outer).not.toHaveBeenCalled();
    expect(viewerEscape.cancel()).toBe(true);
    expect(outer).toHaveBeenCalledOnce();
    expect(viewerEscape.cancel()).toBe(false);
    expect(idle).not.toHaveBeenCalled();
  } finally {
    await act(async () => root.unmount());
    host.remove();
  }
});

it("drops a layer once its action ends", async () => {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  const cancel = vi.fn();
  try {
    await act(async () => root.render(<Layer enabled cancel={cancel} />));
    await act(async () =>
      root.render(<Layer enabled={false} cancel={cancel} />),
    );
    expect(viewerEscape.cancel()).toBe(false);
    expect(cancel).not.toHaveBeenCalled();
  } finally {
    await act(async () => root.unmount());
    host.remove();
  }
});
