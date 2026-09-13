import { EventType } from "@ag-ui/core";
import type { ThreadMessageLike } from "@pond/ui/assistant-runtime";
import type {
  AssistantChunk,
  AssistantMessage,
  AssistantMetadata,
  AssistantSend,
  AssistantSendResult,
} from "@shared/assistant";
import { assistantMetadata, assistantSendResult } from "@shared/assistant";
import { z } from "zod";
import {
  type AssistantConnectionPort,
  runPondTransport,
} from "./assistant-connection";

let activity: (chunk: AssistantChunk) => void = () => {};
let abortRun: (() => void) | undefined;

export function observeAssistantActivity(
  listener: (chunk: AssistantChunk) => void,
) {
  activity = listener;
}

export function toThreadMessage(
  message: AssistantMessage,
  presentationId = message.id,
): ThreadMessageLike {
  return {
    id: presentationId,
    role: message.role === "user" ? "user" : "assistant",
    content: [{ type: "text", text: message.content }],
    metadata: {
      custom: {
        pond: message.metadata,
        pondMessageId: message.id,
        chatId: message.chatId,
      },
    },
  };
}

export function fromThreadMessage(
  message: ThreadMessageLike,
  chatId: string,
): AssistantMessage {
  const metadata = assistantMetadata
    .nullable()
    .safeParse(message.metadata?.custom?.pond);
  const content =
    typeof message.content === "string"
      ? message.content
      : message.content
          .flatMap((part) =>
            part.type === "text" && "text" in part ? [part.text] : [],
          )
          .join("");
  return {
    id:
      z.string().safeParse(message.metadata?.custom?.pondMessageId).data ??
      message.id ??
      "",
    chatId:
      z.string().safeParse(message.metadata?.custom?.chatId).data ?? chatId,
    role: message.role === "user" ? "user" : "assistant",
    content,
    metadata: metadata.success ? metadata.data : null,
  };
}

const defaultPort: AssistantConnectionPort = {
  send(input) {
    return window.pond
      .query("agent.send", input)
      .then((result) => assistantSendResult.parse(result));
  },
  async stop(input) {
    await window.pond.query("agent.stop", input);
  },
  subscribe: (listener) => window.pond.onAgentChunk(listener),
  onActivity: (chunk) => activity(chunk),
};

export async function runAssistant(
  input: AssistantSend,
  _metadata: AssistantMetadata,
  onDelta?: (text: string) => void,
  port: AssistantConnectionPort = defaultPort,
): Promise<AssistantSendResult> {
  const controller = new AbortController();
  const stop = () => controller.abort();
  abortRun = stop;
  let assembled = "";
  try {
    const result = await runPondTransport(
      port,
      input,
      controller.signal,
      (event) => {
        if (
          event.type === EventType.TEXT_MESSAGE_CONTENT &&
          "delta" in event &&
          typeof event.delta === "string"
        ) {
          assembled += event.delta;
          onDelta?.(assembled);
        }
      },
    );
    return result;
  } finally {
    if (abortRun === stop) abortRun = undefined;
  }
}

export function stopAssistant() {
  abortRun?.();
}
