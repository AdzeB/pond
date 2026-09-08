import { chat } from "@tanstack/ai";
import { openaiCompatibleText } from "@tanstack/ai-openai/compatible";
import { expect, it } from "vitest";
import { z } from "zod";
import { type ChatMessage, completeWithTools } from "./complete";

it("compacts the model request while retaining the complete input history", async () => {
  let requestMessages: Array<{ content: string }> = [];
  const adapter = openaiCompatibleText("offline-fixture", {
    apiKey: "offline-key",
    baseURL: "http://fixture.invalid/v1",
    fetch: async (_url, options) => {
      const body = z.string().parse(options?.body);
      requestMessages = z
        .object({
          messages: z.array(z.object({ content: z.string() })),
        })
        .parse(JSON.parse(body)).messages;
      return new Response(
        `data: ${JSON.stringify({
          id: "reply",
          choices: [
            { index: 0, delta: { content: "Hello" }, finish_reason: "stop" },
          ],
        })}\n\ndata: [DONE]\n\n`,
        {
          headers: { "Content-Type": "text/event-stream" },
        },
      );
    },
  });
  const messages: ChatMessage[] = Array.from({ length: 60 }, (_, index) => ({
    role: index % 2 === 0 ? "user" : "assistant",
    content: `${index}: ${"Earlier discussion. ".repeat(300)}`,
  }));
  messages.push({ role: "user", content: "Hello" });
  const original = structuredClone(messages);
  await completeWithTools(
    {
      provider: "openai",
      model: "offline-fixture",
      apiKey: "offline-key",
      messages,
      context: "Library",
      tools: [],
      retrieveLibrary: async () => [],
      abortController: new AbortController(),
      onText: () => {},
    },
    async function* (options) {
      for await (const chunk of chat({ ...options, adapter, stream: true })) {
        if (chunk.type === "TEXT_MESSAGE_CONTENT" || chunk.type === "RUN_ERROR")
          yield chunk;
      }
    },
  );
  expect(requestMessages.length).toBeLessThan(messages.length);
  expect(requestMessages.at(-1)?.content).toBe("Hello");
  expect(messages).toEqual(original);
});
