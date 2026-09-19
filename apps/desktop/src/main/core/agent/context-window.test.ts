import type { ModelMessage } from "ai";
import { expect, it } from "vitest";
import {
  budgetMessages,
  type ChatMessage,
  completeWithTools,
} from "./complete";
import { promptDump, textModel } from "./mock-model";

it("compacts the model request while retaining the complete input history", async () => {
  const model = textModel("Hello");
  const messages: ChatMessage[] = Array.from({ length: 60 }, (_, index) => ({
    role: index % 2 === 0 ? "user" : "assistant",
    content: `${index}: ${"Earlier discussion. ".repeat(300)}`,
  }));
  messages.push({ role: "user", content: "Hello" });
  const original = structuredClone(messages);
  await completeWithTools({
    provider: "openai",
    model: "offline-fixture",
    apiKey: "offline-key",
    messages,
    context: "Library",
    controls: {
      fast: false,
      contextTokens: 16_000,
      reasoning: "provider-default",
    },
    tools: [],
    languageModel: model,
    abortController: new AbortController(),
    onText: () => {},
  });
  const prompt = promptDump(model);
  expect(model.doStreamCalls.length).toBeGreaterThan(0);
  expect(JSON.stringify(model.doStreamCalls[0]?.prompt).length).toBeLessThan(
    JSON.stringify(messages).length,
  );
  expect(prompt).toContain("Hello");
  expect(messages).toEqual(original);
});

it("removes oldest whole turns and always keeps the current turn", () => {
  const messages: ModelMessage[] = [
    { role: "user", content: `Old question ${"x".repeat(100)}` },
    { role: "assistant", content: `Old answer ${"y".repeat(100)}` },
    { role: "user", content: "Current question" },
  ];
  const kept = budgetMessages(messages, 100, 10, (value) =>
    Array.from(value, (character) => character.codePointAt(0) ?? 0),
  );
  expect(kept).toEqual([{ role: "user", content: "Current question" }]);
});

it("rejects a request when instructions and the current turn exceed Context", async () => {
  const model = textModel("Unused");
  await expect(
    completeWithTools({
      provider: "openai",
      model: "offline-fixture",
      apiKey: "offline-key",
      messages: [{ role: "user", content: "Keep this turn" }],
      context: "Library evidence ".repeat(10_000),
      controls: {
        fast: false,
        contextTokens: 4_096,
        reasoning: "provider-default",
      },
      tools: [],
      languageModel: model,
      abortController: new AbortController(),
      onText: () => {},
    }),
  ).rejects.toThrow("selected Context is too small");
  expect(model.doStreamCalls).toHaveLength(0);
});
