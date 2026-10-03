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
async function openMenu() {
  const trigger = item("Chat Actions");
  if (!trigger) throw new Error("Missing Chat Actions");
  await act(async () => trigger.click());
}
it("starts inline renaming without opening a prompt", async () => {
  await render();
  await openMenu();
  await act(async () => menuItem("Rename Chat")?.click());
  expect(onRename).toHaveBeenCalledOnce();
  expect(document.querySelector('[role="dialog"]')).toBeNull();
});
function item(label: string) {
  return [
    ...document.querySelectorAll<HTMLButtonElement>("button[aria-label]"),
  ].find((element) => element.getAttribute("aria-label") === label);
}
function menuItem(label: string) {
  return [...document.querySelectorAll<HTMLElement>('[role="menuitem"]')].find(
    (element) => element.textContent === label,
  );
}
it("places every chat action in one menu", async () => {
  await render();
  expect(host.querySelectorAll("button[aria-label]")).toHaveLength(1);
  await openMenu();
  expect(
    [...document.querySelectorAll<HTMLElement>('[role="menuitem"]')].map(
      (element) => element.textContent,
    ),
  ).toEqual([
    "Rename Chat",
    "Copy Conversation",
    "Export Markdown",
    "Delete Chat",
  ]);
});
it("copies Markdown through the desktop clipboard operation", async () => {
  await render();
  await openMenu();
  await act(async () => menuItem("Copy Conversation")?.click());
  expect(query).toHaveBeenCalledWith("clipboard.writeText", {
    text: "# Notes\n\n## You\n\n**Hello**\n\n",
  });
});
it.each([true, false])(
  "disables chat mutations while busy or without a saved chat (%s)",
  async (busy) => {
    await render(busy, busy ? "chat" : null);
    expect(item("Chat Actions")?.disabled).toBe(true);
  },
);
it("requires confirmation before deleting and supports cancellation", async () => {
  await render();
  await openMenu();
  await act(async () => menuItem("Delete Chat")?.click());
  expect(document.querySelector('[role="alertdialog"]')?.textContent).toContain(
    "permanently deletes",
  );
  expect(query).not.toHaveBeenCalled();
  await act(async () => item("Close")?.click());
  expect(query).not.toHaveBeenCalled();
});
