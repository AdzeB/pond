import { EventType } from "@ag-ui/core";
import type {
  AssistantChunk,
  AssistantEvent,
  AssistantSendResult,
} from "@shared/assistant";
import { ChatClient } from "@tanstack/ai-client";
import { expect, it, vi } from "vitest";
import { createAssistantConnection } from "./assistant-connection";

const request = {
  chatId: "chat",
  requestId: "request",
  content: "Hello",
  attachmentIds: [],
  scope: { kind: "library" },
  provider: "openai",
};

function fixture() {
  const response = Promise.withResolvers<AssistantSendResult>();
  let receive: (chunk: AssistantChunk) => void = () => {};
  const unsubscribe = vi.fn();
  const activity = vi.fn();
  const stop = vi.fn(async () => {});
  const send = vi.fn(() => response.promise);
  const client = new ChatClient({
    connection: createAssistantConnection({
      send,
      stop,
      onActivity: activity,
      subscribe(listener) {
        receive = listener;
        return unsubscribe;
      },
    }),
  });
  return {
    client,
    response,
    send,
    stop,
    activity,
    unsubscribe,
    emit(chunk: AssistantEvent, requestId = "request") {
      receive({ chatId: "chat", requestId, ...chunk });
    },
  };
}

it("feeds TanStack events, ignores other requests and removes the IPC listener", async () => {
  const f = fixture();
  const pending = f.client.sendMessage("Hello", request);
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
  await pending;
  expect(f.client.getMessages().at(-1)?.parts).toContainEqual(
    expect.objectContaining({ type: "text", content: "Hello back" }),
  );
  expect(f.activity).toHaveBeenCalledOnce();
  expect(f.client.getIsLoading()).toBe(false);
  expect(f.unsubscribe).toHaveBeenCalledOnce();
});

it("stops only the active main request and waits for its persistence to settle", async () => {
  const f = fixture();
  const pending = f.client.sendMessage("Hello", request);
  await vi.waitFor(() => expect(f.send).toHaveBeenCalledOnce());
  f.client.stop();
  expect(f.stop).toHaveBeenCalledWith(
    expect.objectContaining({ chatId: "chat", requestId: "request" }),
  );
  expect(f.unsubscribe).not.toHaveBeenCalled();
  f.response.resolve({ chatId: "chat", accepted: true, stopped: true });
  await pending;
  expect(f.send).toHaveBeenCalledOnce();
  expect(f.unsubscribe).toHaveBeenCalledOnce();
});

it("surfaces transport failure through the TanStack error state", async () => {
  const f = fixture();
  const pending = f.client.sendMessage("Hello", request);
  await vi.waitFor(() => expect(f.send).toHaveBeenCalledOnce());
  f.response.reject(new Error("IPC disconnected"));
  await pending;
  expect(f.client.getError()?.message).toContain("Check the conversation");
  expect(f.client.getIsLoading()).toBe(false);
  expect(f.unsubscribe).toHaveBeenCalledOnce();
});
