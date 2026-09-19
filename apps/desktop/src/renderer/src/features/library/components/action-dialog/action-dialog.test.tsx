import {
  type ActionPreview,
  type ActionQueryInputs,
  ActionRequestSchema,
  ActionRunSchema,
} from "@shared/action-contracts";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  closeActionDialog,
  openActionDialog,
} from "@/features/library/state/action-dialog";
import { ActionDialogHost } from "./";

let root: Root;
let host: HTMLDivElement;
const requests: string[] = [];
let failRun = false;
beforeEach(() => {
  requests.length = 0;
  failRun = false;
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  vi.stubGlobal("pond", {
    query: async (
      name: string,
      input: ActionQueryInputs[keyof ActionQueryInputs],
    ) => {
      requests.push(name);
      if (
        name === "actions.list" ||
        name === "saves.getMany" ||
        name === "folders.list" ||
        name === "folders.memberships"
      )
        return [];
      if (name === "actions.preview") {
        const request = ActionRequestSchema.parse(input);
        const preview: ActionPreview = {
          token: "reviewed",
          unchanged: 0,
          changes: request.ids.map((id) => ({
            id,
            before: {
              folderIds: [],
              title: "Original",
              tags: [],
              rating: null,
              notes: null,
            },
            after: {
              folderIds: [],
              title: "Original 1",
              tags: [],
              rating: null,
              notes: null,
            },
          })),
        };
        return preview;
      }
      if (name === "actions.run") {
        expect(ActionRunSchema.parse(input).expectedToken).toBe("reviewed");
        if (failRun)
          throw new Error("The selection changed. Review a new preview.");
        return { changed: 1 };
      }
      throw new Error(`Unexpected query ${name}`);
    },
  });
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(() => {
    closeActionDialog();
    root.unmount();
  });
  host.remove();
  vi.unstubAllGlobals();
});
function button(text: string) {
  const found = [...document.querySelectorAll("button")].find(
    (node) => node.textContent === text,
  );
  if (!found) throw new Error(`Missing ${text}`);
  return found;
}
async function render() {
  await act(async () => {
    openActionDialog(["save-a"], "rename");
    root.render(<ActionDialogHost />);
  });
}

it("requires a preview before applying a rename and invalidates it after editing", async () => {
  await render();
  expect(button("Apply Changes").disabled).toBe(true);
  await act(async () => button("Preview").click());
  expect(button("Apply Changes").disabled).toBe(false);
  const field = [...document.querySelectorAll("input")].find(
    (node) => node.value === "{title} {n}",
  );
  if (!field) throw new Error("Missing pattern field");
  await act(async () => {
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )?.set?.call(field, "{n}");
    field.dispatchEvent(new Event("input", { bubbles: true }));
  });
  expect(button("Apply Changes").disabled).toBe(true);
  expect(requests).not.toContain("actions.run");
  await act(async () => button("Preview").click());
  await act(async () => button("Apply Changes").click());
  expect(requests).toContain("actions.run");
  expect(document.querySelector('[role="dialog"]')).toBeNull();
});

it("keeps a failed action open and requires another preview", async () => {
  await render();
  failRun = true;
  await act(async () => button("Preview").click());
  await act(async () => button("Apply Changes").click());
  expect(document.querySelector('[role="alert"]')?.textContent).toContain(
    "selection changed",
  );
  expect(button("Apply Changes").disabled).toBe(true);
});
