import { EventType } from "@ag-ui/core";
import type {
  AssistantChunk,
  AssistantSend,
  AssistantSendResult,
} from "@shared/assistant";
import { assistantSend, assistantSendResult } from "@shared/assistant";
import type { StreamChunk } from "@tanstack/ai";

export interface AssistantConnectionPort {
  send: (input: AssistantSend) => Promise<AssistantSendResult>;
  stop: (input: { chatId: string; requestId: string }) => Promise<void>;
  subscribe: (listener: (chunk: AssistantChunk) => void) => () => void;
  onActivity: (chunk: AssistantChunk) => void;
}

export async function runPondTransport(
  port: AssistantConnectionPort,
  data: unknown,
  signal: AbortSignal | undefined,
  onStream: (event: StreamChunk) => void,
): Promise<AssistantSendResult> {
  const input = assistantSend.parse(data);
  const chunks: StreamChunk[] = [];
  let finished = false;
  let terminal = false;
  let wake: (() => void) | undefined;
  const push = (event: StreamChunk) => {
    if (event.type === "RUN_FINISHED" || event.type === "RUN_ERROR")
      terminal = true;
    chunks.push(event);
    wake?.();
  };
  const unsubscribe = port.subscribe((chunk) => {
    if (chunk.chatId !== input.chatId || chunk.requestId !== input.requestId)
      return;
    if (chunk.type === "stream" && chunk.event) push(chunk.event);
    else port.onActivity(chunk);
  });
  const stop = () => {
    void port.stop(input).catch(() => {
      push({
        type: EventType.RUN_ERROR,
        message: "Could not stop the reply. Try again.",
      });
    });
  };
  signal?.addEventListener("abort", stop, { once: true });
  const pending = port
    .send(input)
    .then(
      (response) => {
        const result = assistantSendResult.parse(response);
        if (!terminal) {
          if (result.error)
            push({ type: EventType.RUN_ERROR, message: result.error });
          else
            push({
              type: EventType.RUN_FINISHED,
              threadId: input.chatId,
              runId: input.requestId,
            });
        }
        return result;
      },
      () => {
        push({
          type: EventType.RUN_ERROR,
          message:
            "Could not finish the request. Check the conversation before trying again.",
        });
        throw new Error(
          "Could not finish the request. Check the conversation before trying again.",
        );
      },
    )
    .finally(() => {
      finished = true;
      wake?.();
    });
  if (signal?.aborted) stop();
  try {
    while (!finished || chunks.length) {
      const chunk = chunks.shift();
      if (chunk) onStream(chunk);
      else
        await new Promise<void>((resolve) => {
          wake = resolve;
        });
    }
    return await pending;
  } finally {
    try {
      await pending.catch(() => undefined);
    } finally {
      signal?.removeEventListener("abort", stop);
      unsubscribe();
    }
  }
}
