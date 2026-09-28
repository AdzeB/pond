import { Dialog } from "@pond/ui";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ChatActions } from "./chat-actions";

let host: HTMLDivElement;
let root: Root;
const query = vi.fn(async () => ({ ok: true }));
const onRename = vi.fn();
beforeEach(() => {
  vi.stubGlobal("pond", { query });
  query.mockClear();
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});
async function render(disabled = false, chatId: string | null = "chat") {
  await act(async () =>
    root.render(
      <>
        <ChatActions
          chatId={chatId}
          title="Notes"
          disabled={disabled}
          onRename={onRename}
          messages={
            chatId
              ? [
                  {
                    id: "message",
                    chatId,
                    role: "user",
                    content: "**Hello**",
                    metadata: null,
                  },
                ]
              : []
          }
        />
        <Dialog.Host />
      </>,
    ),
  );
}
it("starts inline renaming without opening a prompt", async () => {
  await render();
  await act(async () => item("Rename Chat")?.click());
  expect(onRename).toHaveBeenCalledOnce();
  expect(document.querySelector('[role="dialog"]')).toBeNull();
});
function item(label: string) {
  return [
    ...document.querySelectorAll<HTMLButtonElement>("button[aria-label]"),
  ].find((element) => element.getAttribute("aria-label") === label);
}
it("copies Markdown through the desktop clipboard operation", async () => {
  await render();
  await act(async () => item("Copy Conversation")?.click());
  expect(query).toHaveBeenCalledWith("clipboard.writeText", {
    text: "# Notes\n\n## You\n\n**Hello**\n\n",
  });
});
it.each([true, false])(
  "disables chat mutations while busy or without a saved chat (%s)",
  async (busy) => {
    await render(busy, busy ? "chat" : null);
    for (const label of [
      "Rename Chat",
      "Copy Conversation",
      "Export Markdown",
      "Delete Chat",
    ]) {
      expect(item(label)?.disabled).toBe(true);
    }
  },
);
it("requires confirmation before deleting and supports cancellation", async () => {
  await render();
  await act(async () => item("Delete Chat")?.click());
  expect(document.querySelector('[role="alertdialog"]')?.textContent).toContain(
    "permanently deletes",
  );
  expect(query).not.toHaveBeenCalled();
  await act(async () => item("Close")?.click());
  expect(query).not.toHaveBeenCalled();
});
