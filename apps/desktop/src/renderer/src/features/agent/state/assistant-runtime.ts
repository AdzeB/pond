import type {
  AssistantChunk,
  AssistantMessage,
  AssistantMetadata,
  AssistantSend,
  AssistantSendResult,
} from "@shared/assistant";
import { assistantMetadata, assistantSendResult } from "@shared/assistant";
import { ChatClient, type UIMessage } from "@tanstack/ai-client";
import type { UseChatReturn } from "@tanstack/ai-react";
import { useSelector } from "@tanstack/react-store";
import { Store } from "@tanstack/store";
import { z } from "zod";
import { createAssistantConnection } from "./assistant-connection";

const revision = new Store(0);
const changed = () => revision.setState((value) => value + 1);
let activity: (chunk: AssistantChunk) => void = () => {};
let settlement: Promise<AssistantSendResult> | undefined;

export const assistantClient = new ChatClient<[]>({
  tools: [],
  queue: "drop",
  connection: createAssistantConnection({
    send(input) {
      settlement = window.pond
        .query("agent.send", input)
        .then((result) => assistantSendResult.parse(result));
      return settlement;
    },
    async stop(input) {
      await window.pond.query("agent.stop", input);
    },
    subscribe: (listener) => window.pond.onAgentChunk(listener),
    onActivity: (chunk) => activity(chunk),
  }),
  onMessagesChange: changed,
  onLoadingChange: changed,
  onErrorChange: changed,
  onStatusChange: changed,
  onSubscriptionChange: changed,
  onConnectionStatusChange: changed,
  onSessionGeneratingChange: changed,
  onQueueChange: changed,
  onRunIdChange: changed,
  onInterruptStateChange: changed,
});

export function observeAssistantActivity(
  listener: (chunk: AssistantChunk) => void,
) {
  activity = listener;
}

export function toChatMessage(
  message: AssistantMessage,
  presentationId = message.id,
): UIMessage<[]> {
  return {
    id: presentationId,
    role: message.role === "user" ? "user" : "assistant",
    parts: [{ type: "text", content: message.content }],
    metadata: {
      pond: message.metadata,
      chatId: message.chatId,
      pondMessageId: message.id,
    },
  };
}

export function fromChatMessage(
  message: UIMessage<[]>,
  chatId: string,
): AssistantMessage {
  const metadata = assistantMetadata
    .nullable()
    .safeParse(message.metadata?.pond);
  return {
    id:
      z.string().safeParse(message.metadata?.pondMessageId).data ?? message.id,
    chatId,
    role: message.role,
    content: message.parts
      .flatMap((part) => (part.type === "text" ? [part.content] : []))
      .join(""),
    metadata: metadata.success ? metadata.data : null,
  };
}

function pendingRequest() {
  return settlement;
}

export async function runAssistant(
  input: AssistantSend,
  metadata: AssistantMetadata,
): Promise<AssistantSendResult> {
  settlement = undefined;
  await assistantClient.sendMessage(
    {
      id: input.requestId,
      content: input.content,
      metadata: { pond: metadata, chatId: input.chatId },
    },
    input,
  );
  // Stopping a client must not unlock another send before main has saved the interrupted turn.
  const result = await pendingRequest();
  if (!result)
    throw assistantClient.getError() ?? new Error("The request did not start.");
  return result;
}

export function useAssistantRuntime(): UseChatReturn<[]> {
  useSelector(revision, (value) => value);
  const client = assistantClient;
  const interrupts = client.getInterruptState();
  return {
    messages: client.getMessages(),
    isLoading: client.getIsLoading(),
    error: client.getError(),
    status: client.getStatus(),
    isSubscribed: client.getIsSubscribed(),
    connectionStatus: client.getConnectionStatus(),
    sessionGenerating: client.getSessionGenerating(),
    runId: client.getCurrentRunId(),
    queue: client.getQueue(),
    interrupts: interrupts.interrupts,
    pendingInterrupts: interrupts.pendingInterrupts,
    interruptErrors: interrupts.interruptErrors,
    resuming: interrupts.resuming,
    sendMessage: (content, options) =>
      client.sendMessage(content, options?.body, options),
    append: (message) => client.append(message),
    stop: () => client.stop(),
    reload: () => client.reload(),
    clear: () => client.clear(),
    setMessages: (messages) => client.setMessagesManually(messages),
    cancelQueued: (id) => client.cancelQueued(id),
    addToolResult: (result) => client.addToolResult(result),
    addToolApprovalResponse: (response) =>
      client.addToolApprovalResponse(response),
    resolveInterrupts: client.resolveInterrupts.bind(client),
    cancelInterrupts: () => client.cancelInterrupts(),
    retryInterrupts: () => client.retryInterrupts(),
    resumeInterruptsUnsafe: (resume, state) =>
      client.resumeInterruptsUnsafe(resume, state),
    resumeInterrupts: (resume, state) => client.resumeInterrupts(resume, state),
  };
}
