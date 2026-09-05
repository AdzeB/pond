import { expect, it, vi } from "vitest";
import { libraryContext } from "./context";

vi.mock("../folders", () => ({
  listFolders: async () => [],
  folderIdsForSave: async () => [],
}));
vi.mock("./tools", async () => {
  const { z } = await import("zod");
  return {
    searchLibraryInput: z.object({ query: z.string().optional() }),
    readSaveInput: z.object({ id: z.string() }),
    grepLibraryInput: z.object({ query: z.string() }),
    applyFilterInput: z.object({ query: z.unknown() }),
    setOverlayInput: z.object({}).passthrough(),
    citeSavesInput: z.object({ ids: z.array(z.string()) }),
    openSaveInput: z.object({ id: z.string() }),
    libraryOverviewInput: z.object({}),
    describeSavesInput: z.object({ ids: z.array(z.string()) }),
    searchLibrary: async () => ({
      saves: [
        {
          id: "known",
          title: "Film",
          source: "arena",
          url: "https://example.com",
        },
      ],
    }),
    readSave: async () => ({ error: "Unavailable" }),
    grepLibrary: async () => ({ hits: [] }),
    libraryOverview: async () => ({}),
    applyFilter: async () => ({ ok: true }),
    setOverlay: async () => ({ ok: true }),
    citeSaves: async () => ({ ok: true, ids: [] }),
    openSave: async () => ({ ok: true }),
    describeSaves: async () => ({ ids: [], images: 0 }),
    findDuplicateSaves: async () => ({ groups: [] }),
  };
});

it("shows only verified result IDs and streams the same data it persists", async () => {
  const onResults = vi.fn();
  const onSteps = vi.fn();
  const onSources = vi.fn();
  const context = libraryContext({
    scope: {},
    signal: new AbortController().signal,
    onActivity: vi.fn(),
    onSources,
    onResults,
    onSteps,
  });
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
