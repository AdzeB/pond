// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { ConversationThread } from "./conversation-thread";

it("follows new content until scrolled away, resumes on request, and resets for another chat", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  let resized = () => {};
  const disconnect = vi.fn();
  vi.stubGlobal(
    "ResizeObserver",
    class {
      constructor(callback: () => void) {
        resized = callback;
      }
      observe() {}
      disconnect = disconnect;
    },
  );
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  const render = (chatId: string, text: string, requestId?: string) =>
    act(async () => {
      root.render(
        <ConversationThread chatId={chatId} requestId={requestId}>
          <p>{text}</p>
        </ConversationThread>,
      );
    });
  try {
    await render("first", "First response");
    const frame = host.querySelector<HTMLElement>(
      '[aria-label="Conversation"]',
    );
    if (!frame) throw new Error("Conversation not rendered");
    let height = 1000;
    Object.defineProperties(frame, {
      scrollHeight: { get: () => height },
      clientHeight: { value: 300 },
    });
    await act(async () => resized());
    expect(frame.scrollTop).toBe(1000);
    await act(async () => {
      frame.scrollTop = 200;
      frame.dispatchEvent(new Event("scroll"));
    });
    expect(
      host.querySelector('button[aria-label="Latest Reply"]:not([inert])'),
    ).not.toBeNull();
    height = 1200;
    await render("first", "A longer response has arrived");
    await act(async () => resized());
    expect(frame.scrollTop).toBe(200);
    await act(async () => host.querySelector("button")?.click());
    expect(frame.scrollTop).toBe(1200);
    expect(host.querySelector("button:not([inert])")).toBeNull();
    await act(async () => {
      frame.scrollTop = 100;
      frame.dispatchEvent(new Event("scroll"));
    });
    await render("first", "Sending a follow-up", "request");
    expect(frame.scrollTop).toBe(1200);
    await act(async () => {
      frame.scrollTop = 100;
      frame.dispatchEvent(new Event("scroll"));
    });
    await render("first", "The reply completed");
    expect(frame.scrollTop).toBe(100);
    expect(document.activeElement).toBe(frame);
    await act(async () => {
      frame.scrollTop = 100;
      frame.dispatchEvent(new Event("scroll"));
    });
    await render("second", "Another conversation");
    expect(frame.scrollTop).toBe(1200);
    expect(host.querySelector("button:not([inert])")).toBeNull();
  } finally {
    await act(async () => root.unmount());
    host.remove();
    vi.unstubAllGlobals();
  }
  expect(disconnect).toHaveBeenCalledOnce();
});
