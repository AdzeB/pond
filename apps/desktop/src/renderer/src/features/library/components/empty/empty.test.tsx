import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FolderEmpty } from "./";

describe("FolderEmpty", () => {
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
    vi.unstubAllGlobals();
  });

  it("invites dropping files instead of clearing a search", async () => {
    await act(async () => root.render(<FolderEmpty />));
    const text = host.textContent ?? "";
    expect(text).toContain("This folder is empty");
    expect(text).toContain("Drag and drop onto this window to add.");
    expect(text).not.toContain("Import Folders");
    expect(text).not.toContain("Import Files");
    expect(text).not.toContain("No results found");
    expect(text).not.toContain("Clear Search and Filters");
  });
});
