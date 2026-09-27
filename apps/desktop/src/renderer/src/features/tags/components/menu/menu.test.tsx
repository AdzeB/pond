import { PickerPanel } from "@pond/ui";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { TagMenu } from "./";

it("keeps an inline tag draft after a failed create and applies it only after retry succeeds", async () => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  let fail = true;
  const created: string[] = [];
  vi.stubGlobal("pond", {
    onSyncAction: () => () => {},
    query: async (name: string, input: { name?: string }) => {
      if (name === "tags.list") {
        return [
          {
            id: "recent",
            name: "Recent Tag",
            starred: false,
            description: null,
            lastUsedAt: 10,
            usageCount: 0,
            createdAt: null,
          },
          {
            id: "other",
            name: "Other Tag",
            starred: false,
            description: null,
            lastUsedAt: null,
            usageCount: 0,
            createdAt: null,
          },
        ];
      }
      if (name === "tagGroups.list") {
        return [
          {
            id: "work",
            name: "Work",
            description: null,
            color: null,
            sortOrder: 0,
            collapsed: false,
            tagIds: ["recent"],
            tagNames: ["Recent Tag"],
          },
        ];
      }
      if (name === "tags.create") {
        if (fail) throw new Error("Library unavailable");
        created.push(input.name ?? "");
        return { id: "new", name: input.name };
      }
      throw new Error(`Unexpected query ${name}`);
    },
  });
  const applied: string[] = [];
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  try {
    await act(async () =>
      root.render(
        <PickerPanel.Root open>
          <PickerPanel.Portal>
            <PickerPanel.Positioner>
              <PickerPanel.Popup>
                <TagMenu
                  allowCreate
                  onToggle={(name) => {
                    applied.push(name);
                  }}
                />
              </PickerPanel.Popup>
            </PickerPanel.Positioner>
          </PickerPanel.Portal>
        </PickerPanel.Root>,
      ),
    );
    const others = Array.from(document.querySelectorAll("button")).find(
      (button) => button.textContent?.includes("Others (1)"),
    );
    if (!others) throw new Error("Missing collapsible section");
    expect(document.body.textContent).toContain("Other Tag");
    expect(document.querySelector('[role="radiogroup"]')).toBeNull();
    expect(document.querySelector('[data-layout="grid"]')).not.toBeNull();
    expect(document.querySelector('[aria-label="Use grid layout"]')).toBeNull();
    expect(document.querySelector("kbd")).toBeNull();
    await act(async () => others.click());
    expect(document.body.textContent).not.toContain("Other Tag");
    expect(document.querySelector('[role="listbox"]')).not.toBeNull();
    await act(async () => others.click());
    expect(document.body.textContent).toContain("Other Tag");

    const input = document.querySelector("input");
    if (!input) throw new Error("Missing tag search");
    const initialActive = input.getAttribute("aria-activedescendant");
    await act(async () =>
      input.dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }),
      ),
    );
    expect(input.getAttribute("aria-activedescendant")).not.toBe(initialActive);
    expect(document.activeElement).toBe(input);
    await act(async () => {
      Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      )?.set?.call(input, "New Tag");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await act(async () =>
      input.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
      ),
    );
    expect(document.querySelector('[role="alert"]')?.textContent).toContain(
      "Library unavailable",
    );
    expect(input.value).toBe("New Tag");
    expect(applied).toEqual([]);
    fail = false;
    await act(async () =>
      input.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
      ),
    );
    expect(created).toEqual(["New Tag"]);
    expect(applied).toEqual(["New Tag"]);
    expect(input.value).toBe("");
  } finally {
    await act(() => root.unmount());
    host.remove();
    vi.unstubAllGlobals();
  }
});
