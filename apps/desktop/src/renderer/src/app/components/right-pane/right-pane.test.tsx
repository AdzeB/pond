import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { act, useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RightPaneView } from "./";

interface PaneState {
  pane: "agent" | "inspector" | null;
  saveId: string | null;
  reduceMotion: string;
  agentMounts: number;
  agentUnmounts: number;
}
const state: PaneState = {
  pane: "agent",
  saveId: null,
  reduceMotion: "never",
  agentMounts: 0,
  agentUnmounts: 0,
};
function AgentContent() {
  useEffect(() => {
    state.agentMounts += 1;
    return () => {
      state.agentUnmounts += 1;
    };
  }, []);
  return <textarea aria-label="Draft" />;
}
function InspectorContent({ saveId }: { saveId: string }) {
  return <div>Details {saveId}</div>;
}
function RightPane() {
  return (
    <RightPaneView
      pane={state.pane}
      saveId={state.saveId}
      reduceMotion={state.reduceMotion === "always"}
      assistantPage={false}
      AgentContent={AgentContent}
      InspectorContent={InspectorContent}
    />
  );
}

describe("sliding right panes", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    state.pane = "agent";
    state.saveId = null;
    state.reduceMotion = "never";
    state.agentMounts = 0;
    state.agentUnmounts = 0;
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });

  async function settleAnimation() {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 400));
    });
  }

  afterEach(async () => {
    await act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  it("keeps Assistant mounted and visible while it is the active card", async () => {
    await act(() => root.render(<RightPane />));
    const draft = container.querySelector("textarea");
    if (!draft) throw new Error("Missing draft");
    draft.value = "Keep my draft";
    const agent = container.querySelector('[data-pane="agent"]');
    expect(agent?.hasAttribute("data-active")).toBe(true);
    expect(agent?.hasAttribute("inert")).toBe(false);
  });

  it("slides in the new card while the outgoing card remains painted and inert", async () => {
    await act(() => root.render(<RightPane />));
    const draft = container.querySelector("textarea");
    if (!draft) throw new Error("Missing draft");
    draft.value = "Keep my draft";

    state.saveId = "first";
    state.pane = "inspector";
    await act(() => root.render(<RightPane />));

    expect(draft.closest("[hidden]")).toBeNull();
    expect(draft.closest('[style*="display: none"]')).toBeNull();
    expect(draft.closest("[inert]")).not.toBeNull();
    expect(container.querySelector('[data-pane="agent"]')).not.toBeNull();
    expect(container.querySelector('[data-pane="inspector"]')).not.toBeNull();
    const incoming = container.querySelector<HTMLElement>(
      '[data-pane="inspector"]',
    );
    expect(incoming?.style.transform).toContain("translateX");
    const initialTransform = incoming?.style.transform;
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 80));
    });
    expect(incoming?.style.transform).not.toBe(initialTransform);
    expect(
      container
        .querySelector('[data-pane="inspector"]')
        ?.hasAttribute("data-active"),
    ).toBe(true);
    state.pane = "agent";
    await act(() => root.render(<RightPane />));
    expect(container.querySelector("textarea")).toBe(draft);
    expect(draft.value).toBe("Keep my draft");
  });

  it("preserves Assistant state and subscriptions after a completed exit and reentry", async () => {
    await act(() => root.render(<RightPane />));
    const draft = container.querySelector("textarea");
    if (!draft) throw new Error("Missing draft");
    draft.value = "Keep my draft";
    state.saveId = "first";
    state.pane = "inspector";
    await act(() => root.render(<RightPane />));
    await settleAnimation();

    expect(container.querySelector('[data-pane="agent"]')).toBeNull();
    expect(state.agentMounts).toBe(1);
    expect(state.agentUnmounts).toBe(0);

    state.pane = "agent";
    await act(() => root.render(<RightPane />));
    await settleAnimation();
    expect(container.querySelector("textarea")).toBe(draft);
    expect(draft.value).toBe("Keep my draft");
    expect(container.querySelector('[data-pane="inspector"]')).toBeNull();
    expect(state.agentMounts).toBe(1);
    expect(state.agentUnmounts).toBe(0);
  });

  it("moves the outgoing card away before the incoming card covers the gap", async () => {
    await act(() => root.render(<RightPane />));
    state.saveId = "first";
    state.pane = "inspector";
    await act(() => root.render(<RightPane />));
    await act(async () => {
      await vi.waitFor(
        () => {
          const offsets = ["agent", "inspector"].map((pane) => {
            const panel = container.querySelector<HTMLElement>(
              `[data-pane="${pane}"]`,
            );
            const match = panel?.style.transform.match(
              /translateX\(([\d.]+)%\)/,
            );
            return match ? Number(match[1]) : 0;
          });
          expect(Math.min(...offsets)).toBeGreaterThan(30);
        },
        { interval: 5, timeout: 250 },
      );
    });
  });

  it("finishes repeated interrupted swaps on the requested pane", async () => {
    await act(() => root.render(<RightPane />));
    const draft = container.querySelector("textarea");
    state.saveId = "first";
    for (const pane of ["inspector", "agent", "inspector", "agent"] as const) {
      state.pane = pane;
      await act(() => root.render(<RightPane />));
    }
    await settleAnimation();
    expect(container.querySelectorAll("[data-pane]")).toHaveLength(1);
    expect(
      container.querySelector('[data-active][data-pane="agent"]'),
    ).not.toBeNull();
    expect(container.querySelector("textarea")).toBe(draft);
    expect(state.agentUnmounts).toBe(0);
  });

  it("skips horizontal travel when reduced motion is enabled", async () => {
    state.reduceMotion = "always";
    await act(() => root.render(<RightPane />));
    state.saveId = "first";
    state.pane = "inspector";
    await act(() => root.render(<RightPane />));
    const incoming = container.querySelector<HTMLElement>(
      '[data-pane="inspector"]',
    );
    expect(incoming?.style.transform).not.toMatch(/[1-9]\d*%/);
    await settleAnimation();
    expect(container.querySelectorAll("[data-pane]")).toHaveLength(1);
  });

  it("keeps outgoing Details available when navigating back to the library", async () => {
    state.saveId = "first";
    state.pane = "inspector";
    await act(() => root.render(<RightPane />));
    state.saveId = null;
    state.pane = "agent";
    await act(() => root.render(<RightPane />));
    expect(container.textContent).toContain("Details first");
    expect(container.querySelector('[data-pane="inspector"]')).not.toBeNull();
    expect(container.querySelector('[data-pane="agent"]')).not.toBeNull();
  });

  it("hides both cards when the slot is closed", async () => {
    await act(() => root.render(<RightPane />));
    state.pane = null;
    await act(() => root.render(<RightPane />));
    expect(container.querySelector("[data-active][data-pane]")).toBeNull();
    expect(
      container.querySelector('[data-pane="agent"]')?.hasAttribute("inert"),
    ).toBe(true);
  });

  it("keeps the closing card opaque while the shell slides it offscreen", async () => {
    await act(() => root.render(<RightPane />));
    state.pane = null;
    await act(() => root.render(<RightPane />));
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 80));
    });
    const outgoing = container.querySelector<HTMLElement>(
      '[data-pane="agent"]',
    );
    expect(outgoing).not.toBeNull();
    expect(outgoing?.style.opacity).toBe("1");
    expect(outgoing?.style.transform).not.toMatch(/[1-9]\d*%/);
    await settleAnimation();
    expect(container.querySelector("[data-pane]")).toBeNull();
  });

  it("moves the frame shadow with each sliding panel", () => {
    const css = readFileSync(
      fileURLToPath(import.meta.url).replace(
        /right-pane\.test\.tsx$/,
        "styles.module.css",
      ),
      "utf8",
    );
    expect(css).not.toMatch(/width:\s*200%/);
    expect(css).not.toContain("translateX(-50%)");
    expect(css).toContain("position: absolute");
    expect(css).toContain("var(--window-background-secondary)");
    expect(css).toContain("var(--window-radius)");
    expect(css).not.toMatch(
      /\.viewport\s*\{[^}]*box-shadow:\s*var\(--ds-shadow-xs\);/s,
    );
    expect(css).toMatch(
      /\.panel\s*\{[^}]*box-shadow:\s*var\(--ds-shadow-xs\);/s,
    );
    expect(css).not.toContain("clip-path");
  });

  it("clips sliding cards to the pane bounds", () => {
    const css = readFileSync(
      resolve(dirname(fileURLToPath(import.meta.url)), "styles.module.css"),
      "utf8",
    );
    expect(css).toMatch(/\.viewport\s*\{[^}]*overflow:\s*clip;/s);
    expect(css).toMatch(
      /\.viewport\s*\{[^}]*overflow-clip-margin:\s*var\(--window-inset,\s*8px\);/s,
    );
  });

  it("keeps the surface at the saved width as the shell slot opens or closes", () => {
    const css = readFileSync(
      resolve(
        dirname(fileURLToPath(import.meta.url)),
        "../../../features/library/components/workspace-shell/styles.module.css",
      ),
      "utf8",
    );
    expect(css).toContain('.shell .right-pane[data-slot="right"] > div');
    expect(css).toContain("width: var(--window-right-track)");
    expect(css).toContain("min-width: var(--window-right-track)");
    expect(css).toContain("inset: 0 auto 0 0");
  });
});
