import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";

/**
 * `IS_MAC` is read from `navigator.platform` when the platform module first loads, so the
 * platform has to be in place before the dialog is imported and the module graph reset
 * between cases.
 */
async function renderDialog(
  platform: string,
  status: { state: string; bundleId: string | null } | null,
) {
  Object.defineProperty(globalThis.navigator, "platform", {
    value: platform,
    configurable: true,
  });
  vi.resetModules();
  const calls: string[] = [];
  vi.stubGlobal("pond", {
    async query(name: string) {
      calls.push(name);
      if (name === "extension.safariStatus") {
        if (!status) throw new Error("status unavailable");
        return status;
      }
      if (name === "extension.openSafari") return { ok: true };
      throw new Error(`Unexpected query: ${name}`);
    },
    async openExternal() {
      return { ok: true };
    },
  });
  const { BrowserExtensionDialog } = await import("./index");
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  await act(async () =>
    root.render(<BrowserExtensionDialog open onOpenChange={() => {}} />),
  );
  return {
    calls,
    text: () => document.body.textContent ?? "",
    buttons: () =>
      [...document.body.querySelectorAll("button")].map(
        (button) => button.textContent?.trim() ?? "",
      ),
    async click(label: string) {
      const button = [...document.body.querySelectorAll("button")].find(
        (candidate) => candidate.textContent?.trim() === label,
      );
      if (!button) throw new Error(`No button labelled ${label}`);
      await act(async () => button.click());
    },
    async cleanup() {
      await act(async () => root.unmount());
      host.remove();
      vi.unstubAllGlobals();
    },
  };
}

afterEach(() => {
  document.body.replaceChildren();
});

it("reports Safari as enabled and offers no action", async () => {
  const view = await renderDialog("MacIntel", {
    state: "enabled",
    bundleId: "so.pond.desktop.Extension",
  });
  try {
    expect(view.text()).toContain("Safari");
    expect(view.text()).toContain("Enabled");
    expect(view.buttons()).not.toContain("Open Safari");
    expect(view.text()).not.toContain("Turn on Pond.");
    expect(view.calls).toContain("extension.safariStatus");
  } finally {
    await view.cleanup();
  }
});

it("explains how to switch Safari on when it is installed but off", async () => {
  const view = await renderDialog("MacIntel", {
    state: "disabled",
    bundleId: "so.pond.desktop.Extension",
  });
  try {
    expect(view.text()).toContain("switched off in Safari");
    expect(view.buttons()).toContain("Open Safari");
    expect(view.text()).toContain("Turn on Pond.");
  } finally {
    await view.cleanup();
  }
});

it("opens Safari through the query and surfaces a failure", async () => {
  const view = await renderDialog("MacIntel", {
    state: "not_registered",
    bundleId: "so.pond.desktop.Extension",
  });
  try {
    expect(view.text()).toContain("Open Safari once");
    await view.click("Open Safari");
    expect(view.calls).toContain("extension.openSafari");
  } finally {
    await view.cleanup();
  }
});

it("says so when the build carries no appex", async () => {
  const view = await renderDialog("MacIntel", {
    state: "not_bundled",
    bundleId: null,
  });
  try {
    expect(view.text()).toContain("Not included in this build");
    expect(view.buttons()).not.toContain("Open Safari");
  } finally {
    await view.cleanup();
  }
});

it("hides the Safari row off macOS", async () => {
  const view = await renderDialog("Linux x86_64", {
    state: "enabled",
    bundleId: "so.pond.desktop.Extension",
  });
  try {
    expect(view.text()).not.toContain("Safari");
    expect(view.calls).not.toContain("extension.safariStatus");
  } finally {
    await view.cleanup();
  }
});
