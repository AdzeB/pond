// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { AutoImportSettings } from "./auto-import";

it("hides path controls until Auto-Import is on", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const query = vi.fn(async (name: string) => {
    if (name === "autoImport.status")
      return { enabled: false, path: "", mode: "copy", history: [] };
    return { ok: true };
  });
  vi.stubGlobal("pond", { query });
  const host = document.createElement("div");
  const root = createRoot(host);
  try {
    await act(async () => root.render(<AutoImportSettings />));
    await act(async () => {});
    expect(host.textContent).toContain("Watched Folder");
    expect(host.textContent).not.toContain("Copy files");
    expect(host.textContent).not.toContain("Move files");
  } finally {
    await act(async () => root.unmount());
    vi.unstubAllGlobals();
  }
});

it("shows copy or move and the watched path when enabled", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const query = vi.fn(async (name: string) => {
    if (name === "autoImport.status")
      return {
        enabled: true,
        path: "/Users/me/Inbox",
        mode: "copy",
        history: [
          { at: 1, name: "shot.png", mode: "copy", ok: true, id: "s1" },
        ],
      };
    return { ok: true };
  });
  vi.stubGlobal("pond", { query });
  const host = document.createElement("div");
  const root = createRoot(host);
  try {
    await act(async () => root.render(<AutoImportSettings />));
    await act(async () => {});
    expect(host.textContent).toContain("/Users/me/Inbox");
    expect(host.textContent).toContain("Copy files");
    expect(host.textContent).toContain("shot.png");
  } finally {
    await act(async () => root.unmount());
    vi.unstubAllGlobals();
  }
});
