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
        <button type="button" aria-label="Open Agent Page" />
        <button type="button" aria-label="Close Agent" />
      </ChatHeader>,
    ),
  );
  expect(host.querySelector('[aria-label="New Chat"]')).toBeNull();
  expect(host.querySelector('[aria-label="Open Agent Page"]')).toBeTruthy();
  expect(host.querySelector('[aria-label="Close Agent"]')).toBeTruthy();
});
