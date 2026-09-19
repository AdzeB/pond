import { isStepCount, simulateReadableStream, ToolLoopAgent, tool } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { expect, it, vi } from "vitest";
import { z } from "zod";
import { contextDependencies, libraryContext } from "./context";
import { textChunks, toolCallChunks } from "./mock-model";

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
  const model = new MockLanguageModelV4({
    doStream: async () => {
      const first = calls++ === 0;
      return {
        stream: simulateReadableStream({
          chunks: first
            ? toolCallChunks("search-1", "searchLibrary", { query: "film" })
            : textChunks("Found"),
        }),
      };
    },
  });
  const agent = new ToolLoopAgent({
    model,
    tools: {
      searchLibrary: tool({
        description: search.description,
        inputSchema: search.schema,
        execute: (args) =>
          search.execute(z.record(z.string(), z.json()).parse(args)),
      }),
    },
    stopWhen: isStepCount(2),
  });
  const result = await agent.stream({
    messages: [{ role: "user", content: "Search film" }],
    onToolExecutionStart: context.onToolExecutionStart,
    onToolExecutionEnd: context.onToolExecutionEnd,
  });
  await result.text;
  await context.tools
    .find((tool) => tool.name === "searchLibrary")
    ?.execute({ query: "film" });
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
  await context.tools
    .find((tool) => tool.name === "searchLibrary")
    ?.execute({ query: "film" });
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
