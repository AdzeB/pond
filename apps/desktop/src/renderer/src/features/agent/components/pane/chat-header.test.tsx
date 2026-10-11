import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ChatHeader } from "./chat-header";

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

it("hides New Chat when the pane only has Open and Close", async () => {
  await act(async () =>
    root.render(
      <ChatHeader
        chatId={null}
        chats={[]}
        disabled={false}
        onOpenChat={() => {}}
      >
        <button type="button" aria-label="Open Assistant Page" />
        <button type="button" aria-label="Close Assistant" />
      </ChatHeader>,
    ),
  );
  expect(host.querySelector('[aria-label="New Chat"]')).toBeNull();
  expect(host.querySelector('[aria-label="Open Assistant Page"]')).toBeTruthy();
  expect(host.querySelector('[aria-label="Close Assistant"]')).toBeTruthy();
});

it("renders the chat title as text and puts history in the header actions", async () => {
  await act(async () =>
    root.render(
      <ChatHeader
        chatId="research"
        chats={[{ id: "research", title: "Research" }]}
        disabled={false}
        onOpenChat={() => {}}
      />,
    ),
  );

  const title = host.querySelector('[data-slot="pane-header-title"]');
  const history = host.querySelector('[aria-label="Chat History"]');

  expect(title?.textContent).toBe("Research");
  expect(title?.querySelector("button")).toBeNull();
  expect(history).toBeTruthy();
  expect(history?.closest('[data-slot="pane-header-actions"]')).toBeTruthy();

  await act(async () =>
    history?.dispatchEvent(new MouseEvent("click", { bubbles: true })),
  );
  expect(
    document.body.querySelector('input[aria-label="Chat history"]'),
  ).toBeTruthy();
});

it("renders the rename field in the title location", async () => {
  const onFinishRenaming = vi.fn();
  await act(async () =>
    root.render(
      <ChatHeader
        chatId="research"
        chats={[{ id: "research", title: "Research" }]}
        disabled={false}
        renaming
        onFinishRenaming={onFinishRenaming}
        onOpenChat={() => {}}
      />,
    ),
  );

  const input = host.querySelector<HTMLInputElement>(
    'input[aria-label="Chat name"]',
  );
  expect(input?.value).toBe("Research");
  await act(async () =>
    input?.dispatchEvent(
      new KeyboardEvent("keydown", {
        bubbles: true,
        cancelable: true,
        key: "Escape",
      }),
    ),
  );
  expect(onFinishRenaming).toHaveBeenCalledOnce();
});
