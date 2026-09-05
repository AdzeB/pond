import { expect, it, vi } from "vitest";
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
  await context.tools
    .find((tool) => tool.name === "searchLibrary")
    ?.execute({ query: "film" });
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
