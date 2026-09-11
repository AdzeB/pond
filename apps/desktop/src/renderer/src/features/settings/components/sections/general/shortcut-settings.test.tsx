// @vitest-environment jsdom
import { DEFAULT_PREFS } from "@pond/schema";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { getPrefsSnapshot } from "@/features/settings/state/prefs";
import { ShortcutSettings } from "./shortcut-settings";

it("keeps a rejected OS binding in the recorder and leaves saved preferences unchanged", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const writes: string[] = [];
  vi.stubGlobal("pond", {
    async query(name: string) {
      if (name === "settings.getPrefs") return DEFAULT_PREFS;
      if (name === "settings.globalShortcutStatus")
        return { enabled: true, errors: ["Capture Window is unavailable."] };
      writes.push(name);
      throw new Error(
        "Capture Area is unavailable. Your shortcuts were not changed.",
      );
    },
  });
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  try {
    await act(async () => root.render(<ShortcutSettings />));
    expect(host.textContent).toContain("Capture Window is unavailable.");
    const control = host.querySelector<HTMLButtonElement>(
      'button[aria-label="Change Capture Area shortcut"]',
    );
    if (!control) throw Error("Missing capture shortcut control");
    await act(async () => control.click());
    await act(async () =>
      control.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "F12",
          code: "F12",
          ctrlKey: true,
          altKey: true,
          bubbles: true,
        }),
      ),
    );
    expect(writes).toEqual(["settings.setPrefs"]);
    expect(host.textContent).toContain("Your shortcuts were not changed.");
    expect(control.textContent).toBe("Press keys…");
    expect(
      getPrefsSnapshot()?.shortcuts.overrides["capture.area"],
    ).toBeUndefined();
  } finally {
    await act(async () => root.unmount());
    host.remove();
    vi.unstubAllGlobals();
  }
});
