import {
  type AppendMessage,
  type ThreadMessageLike,
  useExternalStoreRuntime,
} from "@assistant-ui/react";
import type { AssistantMessage, AssistantProvider } from "@shared/assistant";
import { useMemo } from "react";
import { type AssistantState, assistant } from "@/stores/assistant";

export interface PondRuntimeMessage extends AssistantMessage {
  streaming?: boolean;
}

function messageText(message: AppendMessage) {
  return message.content
    .flatMap((part) => (part.type === "text" ? part.text : []))
    .join("\n")
    .trim();
}

function convertMessage(message: PondRuntimeMessage): ThreadMessageLike {
  return {
    id: message.id,
    role: message.role === "user" ? "user" : "assistant",
    content: [{ type: "text", text: message.content }],
    status:
      message.role === "assistant"
        ? message.streaming
          ? { type: "running" }
          : message.metadata?.stopped
            ? { type: "incomplete", reason: "cancelled" }
            : message.metadata?.error
              ? {
                  type: "incomplete",
                  reason: "error",
                  error: message.metadata.error,
                }
              : { type: "complete", reason: "stop" }
        : undefined,
    metadata: { custom: { pondMessage: message } },
  };
}

export function usePondAssistantRuntime(
  state: AssistantState,
  provider: AssistantProvider | "",
) {
  const messages = useMemo<PondRuntimeMessage[]>(() => {
    if (!state.busy || !state.requestId) return state.messages;
    return [
      ...state.messages,
      {
        id: `${state.requestId}:assistant`,
        chatId: state.chatId ?? "pending",
        role: "assistant",
        content: state.stream,
        metadata: {
          sources: state.sources,
          results: state.results,
          steps: state.steps,
        },
        streaming: true,
      },
    ];
  }, [
    state.busy,
    state.chatId,
    state.messages,
    state.requestId,
    state.results,
    state.sources,
    state.steps,
    state.stream,
  ]);

  return useExternalStoreRuntime<PondRuntimeMessage>({
    messages,
    convertMessage,
    isRunning: state.busy,
    isLoading: state.loading,
    isSendDisabled: !provider || state.loading,
    onNew: async (message) => {
      const content = messageText(message);
      if (!content || !provider) return;
      assistant.setDraft(content);
      await assistant.send(provider);
    },
    onCancel: assistant.stop,
    adapters: {
      threadList: {
        threadId: state.chatId ?? undefined,
        isLoading: state.loading,
        threads: state.chats.map((chat) => ({
          id: chat.id,
          status: "regular" as const,
          title: chat.title ?? "New Chat",
        })),
        onSwitchToNewThread: assistant.newChat,
        onSwitchToThread: assistant.openChat,
      },
    },
  });
}
