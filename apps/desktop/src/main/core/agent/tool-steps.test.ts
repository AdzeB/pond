import { isStepCount, simulateReadableStream, ToolLoopAgent, tool } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { expect, it, vi } from "vitest";
import { z } from "zod";
import { textChunks, toolCallChunks } from "./mock-model";
import { createToolTracker } from "./tool-steps";

async function runTool(
  execute: () => Promise<string>,
  controller: AbortController,
) {
  const changed = vi.fn();
  const tracker = createToolTracker(controller.signal, changed);
  let calls = 0;
  const model = new MockLanguageModelV4({
    doStream: async () => {
      const first = calls++ === 0;
      return {
        stream: simulateReadableStream({
          chunks: first
            ? toolCallChunks("call-1", "searchLibrary", { query: "film" })
            : textChunks("Complete"),
        }),
      };
    },
  });
  const agent = new ToolLoopAgent({
    model,
    tools: {
      searchLibrary: tool({
        description: "Search",
        inputSchema: z.object({ query: z.string() }),
        execute,
      }),
    },
    stopWhen: isStepCount(2),
  });
  try {
    const result = await agent.stream({
      messages: [{ role: "user", content: "Search" }],
      abortSignal: controller.signal,
      onToolExecutionStart: tracker.onToolExecutionStart,
      onToolExecutionEnd: tracker.onToolExecutionEnd,
    });
    await result.text;
  } catch {
    expect(controller.signal.aborted).toBe(true);
  }
  tracker.finishPending();
  return { steps: tracker.steps(), changed };
}

it("records cancellation through the SDK lifecycle", async () => {
  const controller = new AbortController();
  const tracked = await runTool(async () => {
    controller.abort();
    return "result";
  }, controller);
  expect(tracked.steps).toMatchObject([
    { id: "call-1", label: "Search library", status: "stopped" },
  ]);
});

it("records failure without exposing raw tool error payloads", async () => {
  const tracked = await runTool(async () => {
    throw new Error("private tool payload");
  }, new AbortController());
  expect(tracked.steps).toMatchObject([{ status: "error", detail: "film" }]);
  expect(JSON.stringify(tracked.changed.mock.calls)).not.toContain(
    "private tool payload",
  );
});

it("records completed tool execution", async () => {
  const tracked = await runTool(async () => "found", new AbortController());
  expect(tracked.steps).toMatchObject([{ status: "complete", detail: "film" }]);
});
