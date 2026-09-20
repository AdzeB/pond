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
      if (name === "folders.security.status")
        return {
          locked: false,
          protected: true,
          hint: "Existing hint",
          lockChildren: true,
          unlockFolderId: null,
        };
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

it("requires a new password before editing password settings", async () => {
  await act(async () => {
    root.render(
      <FolderCustomizeDialog
        folder={{ id: "folder", name: "Folder", color: null }}
        onClose={() => {}}
      />,
    );
  });
  await vi.waitFor(() =>
    expect(
      document.querySelector<HTMLInputElement>("#password-hint")?.value,
    ).toBe("Existing hint"),
  );
  const password = document.querySelector<HTMLInputElement>("#folder-password");
  const hint = document.querySelector<HTMLInputElement>("#password-hint");
  const protect = document.querySelector<HTMLElement>(
    '[aria-label="Protect Subfolders"]',
  );
  expect(hint?.disabled).toBe(true);
  expect(protect?.hasAttribute("data-disabled")).toBe(true);
  expect(document.body.textContent).toContain(
    "Enter a new password to set the hint or subfolder protection.",
  );
  if (!password) throw new Error("Missing password field");
  await act(async () => {
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )?.set?.call(password, "replacement");
    password.dispatchEvent(new Event("input", { bubbles: true }));
  });
  expect(hint?.disabled).toBe(false);
});
