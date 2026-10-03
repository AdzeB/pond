import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it } from "vitest";
import { useRememberedChatScroll } from "./chat-scroll";

function setScrollGeometry(node: HTMLDivElement) {
  Object.defineProperties(node, {
    clientHeight: { configurable: true, value: 100 },
    scrollHeight: { configurable: true, value: 500 },
  });
}

function Conversation({ chatKey }: { chatKey: string }) {
  const rememberScroll = useRememberedChatScroll(chatKey);
  return (
    <div
      key={chatKey}
      data-chat={chatKey}
      ref={(node) => {
        if (node) setScrollGeometry(node);
        rememberScroll(node);
      }}
    />
  );
}

it("restores a conversation's scroll position after switching away and back", async () => {
  const host = document.createElement("div");
  const root = createRoot(host);
  try {
    await act(async () => root.render(<Conversation chatKey="long" />));
    const long = host.querySelector<HTMLDivElement>('[data-chat="long"]');
    expect(long).not.toBeNull();
    if (!long) return;
    long.scrollTop = 226;

    await act(async () => root.render(<Conversation chatKey="short" />));
    const short = host.querySelector<HTMLDivElement>('[data-chat="short"]');
    expect(short).not.toBeNull();
    if (!short) return;
    short.scrollTop = 40;

    await act(async () => root.render(<Conversation chatKey="long" />));
    expect(
      host.querySelector<HTMLDivElement>('[data-chat="long"]')?.scrollTop,
    ).toBe(226);
  } finally {
    await act(async () => root.unmount());
  }
});
