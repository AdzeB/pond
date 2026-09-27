import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { FolderCustomizeDialog } from ".";

let host: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  vi.stubGlobal("pond", {
    query: vi.fn(async (name: string) => {
      if (name === "folders.metadata.get")
        return { description: null, externalLink: null };
      return { ok: true };
    }),
  });
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});

it("shows folder details and presentation controls", async () => {
  await act(async () => {
    root.render(
      <FolderCustomizeDialog
        folder={{ id: "folder", name: "Folder", color: null }}
        onClose={() => {}}
      />,
    );
  });
  expect(document.body.textContent).toContain("Description");
  expect(document.body.textContent).toContain("External Link");
  expect(document.body.textContent).toContain("Icon");
  expect(document.body.textContent).toContain("Color");
  expect(document.querySelector('input[type="password"]')).toBeNull();
});
