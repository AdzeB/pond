// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { CollectShell } from ".";

it("imports a dropped file using the preload path resolver", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const query = vi.fn().mockResolvedValue([]);
  const file = new File(["image"], "drop.png", { type: "image/png" });
  const pathForFile = vi.fn().mockReturnValue("/tmp/drop.png");
  vi.stubGlobal("pond", { query, pathForFile });
  const host = document.createElement("div");
  const root = createRoot(host);
  try {
    await act(async () => root.render(<CollectShell />));
    const target = [...host.querySelectorAll("div")].find(
      (node) => node.textContent === "Drop files",
    );
    expect(target).toBeDefined();
    const event = new Event("drop", { bubbles: true, cancelable: true });
    Object.defineProperty(event, "dataTransfer", { value: { files: [file] } });
    await act(async () => {
      target?.dispatchEvent(event);
    });
    expect(query).toHaveBeenCalledWith("saves.importFiles", {
      paths: ["/tmp/drop.png"],
      tags: [],
      folderIds: [],
    });
  } finally {
    await act(async () => root.unmount());
    vi.unstubAllGlobals();
  }
});
