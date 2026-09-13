import { EventType } from "@ag-ui/core";
import type {
  AssistantChunk,
  AssistantEvent,
  AssistantSendResult,
} from "@shared/assistant";
import { expect, it, vi } from "vitest";
import { runPondTransport } from "./assistant-connection";

const request = {
  chatId: "chat",
  requestId: "request",
  content: "Hello",
  attachmentIds: [],
  scope: { kind: "library" as const },
  provider: "openai" as const,
};

function fixture() {
  const response = Promise.withResolvers<AssistantSendResult>();
  let receive: (chunk: AssistantChunk) => void = () => {};
  const unsubscribe = vi.fn();
  const activity = vi.fn();
  const stop = vi.fn(async () => {});
  const send = vi.fn(() => response.promise);
  const events: string[] = [];
  const controller = new AbortController();
  const pending = runPondTransport(
    {
      send,
      stop,
      onActivity: activity,
      subscribe(listener) {
        receive = listener;
        return unsubscribe;
      },
    },
    request,
    controller.signal,
    (event) => {
      if (event.type === EventType.TEXT_MESSAGE_CONTENT && "delta" in event)
        events.push(String(event.delta));
      if (event.type === EventType.RUN_ERROR && "message" in event)
        events.push(String(event.message));
    },
  );
  return {
    pending,
    response,
    send,
    stop,
    activity,
    unsubscribe,
    events,
    controller,
    emit(chunk: AssistantEvent, requestId = "request") {
      receive({ chatId: "chat", requestId, ...chunk });
    },
  };
}

it("feeds stream events, ignores other requests and removes the IPC listener", async () => {
  const f = fixture();
  await vi.waitFor(() => expect(f.send).toHaveBeenCalledOnce());
  f.emit({
    type: "stream",
    event: { type: EventType.RUN_STARTED, threadId: "chat", runId: "request" },
  });
  f.emit({
    type: "stream",
    event: {
      type: EventType.TEXT_MESSAGE_START,
      messageId: "reply",
      role: "assistant",
    },
  });
  f.emit(
    {
      type: "stream",
      event: {
        type: EventType.TEXT_MESSAGE_CONTENT,
        messageId: "reply",
        delta: "ignored",
      },
    },
    "old-request",
  );
  f.emit({
    type: "stream",
    event: {
      type: EventType.TEXT_MESSAGE_CONTENT,
      messageId: "reply",
      delta: "Hello ",
    },
  });
  f.emit({
    type: "stream",
    event: {
      type: EventType.TEXT_MESSAGE_CONTENT,
      messageId: "reply",
      delta: "back",
    },
  });
  f.emit({ type: "activity", activity: "reading" });
  f.emit({
    type: "stream",
    event: { type: EventType.TEXT_MESSAGE_END, messageId: "reply" },
  });
  f.emit({
    type: "stream",
    event: { type: EventType.RUN_FINISHED, threadId: "chat", runId: "request" },
  });
  f.response.resolve({ chatId: "chat", accepted: true });
  await f.pending;
  expect(f.events.join("")).toBe("Hello back");
  expect(f.activity).toHaveBeenCalledOnce();
  expect(f.unsubscribe).toHaveBeenCalledOnce();
});

it("stops only the active main request and waits for its persistence to settle", async () => {
  const f = fixture();
  await vi.waitFor(() => expect(f.send).toHaveBeenCalledOnce());
  f.controller.abort();
  expect(f.stop).toHaveBeenCalledWith(
    expect.objectContaining({ chatId: "chat", requestId: "request" }),
  );
  expect(f.unsubscribe).not.toHaveBeenCalled();
  f.response.resolve({ chatId: "chat", accepted: true, stopped: true });
  await f.pending;
  expect(f.send).toHaveBeenCalledOnce();
  expect(f.unsubscribe).toHaveBeenCalledOnce();
});

it("surfaces transport failure after the stream listener is removed", async () => {
  const f = fixture();
  await vi.waitFor(() => expect(f.send).toHaveBeenCalledOnce());
  f.response.reject(new Error("IPC disconnected"));
  await expect(f.pending).rejects.toThrow("Check the conversation");
  expect(f.unsubscribe).toHaveBeenCalledOnce();
});
