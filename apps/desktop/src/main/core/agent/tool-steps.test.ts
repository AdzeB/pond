import { chat, maxIterations, toolDefinition } from "@tanstack/ai";
import { openaiCompatibleText } from "@tanstack/ai-openai/compatible";
import { expect, it, vi } from "vitest";
import { z } from "zod";
import { createToolTracker } from "./tool-steps";

async function runTool(
  execute: () => Promise<string>,
  controller: AbortController,
) {
  let requests = 0;
  const changed = vi.fn();
  const tracker = createToolTracker(controller.signal, changed);
  const adapter = openaiCompatibleText("offline-fixture", {
    apiKey: "offline-key",
    baseURL: "http://fixture.invalid/v1",
    fetch: async () => {
      const first = requests++ === 0;
      const chunk = {
        id: "completion",
        choices: [
          {
            index: 0,
            delta: first
              ? {
                  tool_calls: [
                    {
                      index: 0,
                      id: "call-1",
                      type: "function",
                      function: {
                        name: "searchLibrary",
                        arguments: '{"query":"film"}',
                      },
                    },
                  ],
                }
              : { content: "Complete" },
            finish_reason: first ? "tool_calls" : "stop",
          },
        ],
      };
      return new Response(
        `data: ${JSON.stringify(chunk)}\n\ndata: [DONE]\n\n`,
        {
          headers: { "Content-Type": "text/event-stream" },
        },
      );
    },
  });
  const tool = toolDefinition({
    name: "searchLibrary",
    description: "Search",
    inputSchema: z.object({ query: z.string() }),
  }).server(execute);
  try {
    for await (const _chunk of chat({
      adapter,
      messages: [{ role: "user", content: "Search" }],
      tools: [tool],
      middleware: [tracker.middleware],
      abortController: controller,
      agentLoopStrategy: maxIterations(2),
    })) {
      // Consume the real SDK's tool loop; the fixture performs no network requests.
    }
  } catch {
    expect(controller.signal.aborted).toBe(true);
  }
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
