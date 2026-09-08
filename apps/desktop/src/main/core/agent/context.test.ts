import { chat, maxIterations, toolDefinition } from "@tanstack/ai";
import { openaiCompatibleText } from "@tanstack/ai-openai/compatible";
import { expect, it, vi } from "vitest";
import { z } from "zod";
import { contextDependencies, libraryContext } from "./context";

const dependencies = {
  ...contextDependencies,
  listFolders: async () => [],
  folderIdsForSave: async () => [],
  searchLibrary: async () => ({
    saves: [
      {
        id: "known",
        title: "Film",
        source: "arena" as const,
        url: "https://example.com",
        author: null,
        notes: null,
        description: null,
      },
    ],
  }),
};

it("shows only verified result IDs and streams the same data it persists", async () => {
  const onResults = vi.fn();
  const onSteps = vi.fn();
  const onSources = vi.fn();
  const context = libraryContext(
    {
      scope: {},
      signal: new AbortController().signal,
      onActivity: vi.fn(),
      onSources,
      onResults,
      onSteps,
    },
    dependencies,
  );
  const show = context.tools.find((tool) => tool.name === "showSaves");
  if (!show) throw new Error("Missing showSaves tool");
  await expect(
    show.execute({ title: "References", saveIds: ["unknown"] }),
  ).rejects.toThrow(/Only Saves/);
  expect(context.results()).toEqual([]);
  const search = context.tools.find((tool) => tool.name === "searchLibrary");
  if (!search) throw new Error("Missing searchLibrary tool");
  let calls = 0;
  const adapter = openaiCompatibleText("offline-fixture", {
    apiKey: "offline-key",
    baseURL: "http://fixture.invalid/v1",
    fetch: async () => {
      const first = calls++ === 0;
      return new Response(
        `data: ${JSON.stringify({
          id: "result",
          choices: [
            {
              index: 0,
              delta: first
                ? {
                    tool_calls: [
                      {
                        index: 0,
                        id: "search-1",
                        type: "function",
                        function: {
                          name: "searchLibrary",
                          arguments: '{"query":"film"}',
                        },
                      },
                    ],
                  }
                : { content: "Found" },
              finish_reason: first ? "tool_calls" : "stop",
            },
          ],
        })}\n\ndata: [DONE]\n\n`,
        { headers: { "Content-Type": "text/event-stream" } },
      );
    },
  });
  for await (const _chunk of chat({
    adapter,
    messages: [{ role: "user", content: "Search film" }],
    tools: [
      toolDefinition({
        name: search.name,
        description: search.description,
        inputSchema: search.schema,
      }).server((args) =>
        search.execute(z.record(z.string(), z.json()).parse(args)),
      ),
    ],
    middleware: [context.middleware],
    agentLoopStrategy: maxIterations(2),
  })) {
    // Drive the same middleware lifecycle as a real provider call.
  }
  await context.retrieve({ query: "film" });
  expect(onSources).toHaveBeenCalledTimes(1);
  expect(context.results()).toEqual([]);
  await show.execute({ title: "References", saveIds: ["known", "known"] });
  expect(context.results()).toEqual([
    { title: "References", saveIds: ["known"] },
  ]);
  expect(onResults).toHaveBeenLastCalledWith(context.results());
  expect(context.steps()).toMatchObject([
    { label: "Search library", detail: "film", status: "complete" },
  ]);
  expect(onSteps.mock.calls[0]?.[0][0].status).toBe("running");
  expect(onSteps).toHaveBeenLastCalledWith(context.steps());
});

it("keeps distinct curated groups and deduplicates repeats regardless of order", async () => {
  const context = libraryContext(
    {
      scope: {},
      signal: new AbortController().signal,
      onActivity: vi.fn(),
      onSources: vi.fn(),
    },
    {
      ...dependencies,
      searchLibrary: async () => ({
        saves: ["one", "two", "three"].map((id) => ({
          id,
          title: id,
          source: "arena" as const,
          url: `https://example.com/${id}`,
          author: null,
          notes: null,
          description: null,
        })),
      }),
    },
  );
  await context.retrieve({ query: "film" });
  const show = context.tools.find((tool) => tool.name === "showSaves");
  if (!show) throw new Error("Missing showSaves");
  await show.execute({ title: "Lighting", saveIds: ["one", "two"] });
  await show.execute({ title: "Lighting", saveIds: ["two", "one"] });
  await expect(
    show.execute({ title: "Composition", saveIds: ["two", "three"] }),
  ).resolves.toMatchObject({
    references: [
      { id: "two", reference: "#save-2" },
      { id: "three", reference: "#save-3" },
    ],
  });
  await show.execute({ title: "Color", saveIds: ["one", "two"] });
  await expect(
    show.execute({ title: "Unknown", saveIds: ["missing"] }),
  ).rejects.toThrow(/Only Saves/);
  expect(context.results()).toEqual([
    { title: "Lighting", saveIds: ["one", "two"] },
    { title: "Composition", saveIds: ["two", "three"] },
    { title: "Color", saveIds: ["one", "two"] },
  ]);
  expect(context.sources()).toHaveLength(3);
});
