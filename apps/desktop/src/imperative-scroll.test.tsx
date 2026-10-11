import { MotionConfig } from "motion/react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Thread } from "../../../packages/ui/src/thread";

class ElementResizeObserver implements ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

describe("Latest Message scrolling", () => {
  afterEach(() => vi.unstubAllGlobals());

  it.each(["always", "never"] as const)(
    "honors the %s reduced-motion policy",
    async (reducedMotion) => {
      vi.stubGlobal("ResizeObserver", ElementResizeObserver);
      const host = document.createElement("div");
      const viewport = document.createElement("div");
      const scrollTo = vi.fn();
      Object.defineProperties(viewport, {
        scrollHeight: { value: 1000 },
        clientHeight: { value: 200 },
        scrollTo: { value: scrollTo },
      });
      document.body.append(host);
      const root = createRoot(host);
      try {
        await act(() =>
          root.render(
            <MotionConfig reducedMotion={reducedMotion}>
              <Thread.ScrollToLatest viewport={viewport} />
            </MotionConfig>,
          ),
        );
        const latest = host.querySelector("button");
        if (!latest) throw new Error("Missing Latest Message action");
        await act(() => latest.click());
        expect(scrollTo).toHaveBeenCalledWith({
          top: 1000,
          behavior: reducedMotion === "always" ? "instant" : "smooth",
        });
      } finally {
        await act(() => root.unmount());
        host.remove();
      }
    },
  );
});
