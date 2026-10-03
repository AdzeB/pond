import { DEFAULT_PREFS } from "@pond/schema";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { ScreenshotIntakeSettings } from "./";

afterEach(() => vi.unstubAllGlobals());

it("shows the capture controls without waiting for Library folders", async () => {
  vi.stubGlobal("pond", {
    query(name: string) {
      if (name === "screenshots.status")
        return Promise.resolve({
          ...DEFAULT_PREFS.screenshots,
          tools: [{ id: "pond", label: "Pond Capture", installed: true }],
          history: [],
        });
      return new Promise(() => {});
    },
  });
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  try {
    await act(async () => root.render(<ScreenshotIntakeSettings />));
    expect(host.textContent).toContain("Screenshot Tool");
    expect(host.textContent).toContain("Pond Capture");
    expect(host.textContent).toContain("Add Folder");
  } finally {
    await act(async () => root.unmount());
    host.remove();
  }
});

it.each(["screenshots.status", "folders.list"])(
  "keeps the section visible and recovers when %s fails",
  async (failedQuery) => {
    let fail = true;
    vi.stubGlobal("pond", {
      async query(name: string) {
        if (name === failedQuery && fail)
          throw new Error("Library unavailable");
        if (name === "screenshots.status")
          return {
            ...DEFAULT_PREFS.screenshots,
            tools: [{ id: "pond", label: "Pond Capture", installed: true }],
            history: [],
          };
        return [];
      },
    });
    const host = document.createElement("div");
    document.body.append(host);
    const root = createRoot(host);
    try {
      await act(async () => root.render(<ScreenshotIntakeSettings />));
      expect(host.textContent).toContain("Screenshot Tool");
      expect(host.textContent).toContain("Screenshot Folders");
      expect(host.querySelector('[role="alert"]')).not.toBeNull();
      if (failedQuery === "folders.list")
        expect(host.textContent).toContain("Pond Capture");
      const retry = [...host.querySelectorAll("button")].find(
        (button) => button.textContent === "Retry",
      );
      if (!retry) throw new Error("Missing retry control");
      fail = false;
      await act(async () => retry.click());
      expect(host.querySelector('[role="alert"]')).toBeNull();
      expect(host.textContent).toContain("Pond Capture");
      expect(
        host
          .querySelector('[aria-label="Screenshot Tool"]')
          ?.hasAttribute("disabled"),
      ).toBe(false);
    } finally {
      await act(async () => root.unmount());
      host.remove();
    }
  },
);
