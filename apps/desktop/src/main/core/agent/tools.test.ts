import { SQLiteSyncDialect } from "drizzle-orm/sqlite-core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { readSave, searchLibrary, searchLibraryInput } from "./tools";

const mock = vi.hoisted(() => ({
  where: vi.fn(),
  retrieve: vi.fn().mockResolvedValue({ saves: [], hits: [] }),
}));
vi.mock("../../db", () => ({
  getDb: async () => ({
    select: () => ({
      from: () => ({
        where: (condition: unknown) => {
          mock.where(condition);
          return {
            limit: async () => [],
            orderBy: () => ({ limit: async () => [] }),
          };
        },
      }),
    }),
  }),
}));
vi.mock("../../lib/broadcast", () => ({ broadcast: vi.fn() }));
vi.mock("../library-retrieval", async (original) => ({
  ...(await original<typeof import("../library-retrieval")>()),
  retrieveLibrary: mock.retrieve,
}));
vi.mock("../folders", () => ({ listFolders: async () => [] }));
const dialect = new SQLiteSyncDialect();
const query = () => dialect.sqlToQuery(mock.where.mock.calls[0]?.[0]);
beforeEach(() => vi.clearAllMocks());

describe("Assistant library boundaries", () => {
  it("does not turn an empty attachment scope into unrestricted search", async () => {
    await searchLibrary({}, { saveIds: [] });
    expect(mock.retrieve).toHaveBeenCalledExactlyOnceWith({}, { saveIds: [] });
  });
  it("restricts guessed Save IDs to attached IDs and excludes Trash", async () => {
    expect(
      await readSave({ id: "guessed" }, { saveIds: ["attached"] }),
    ).toHaveProperty("error");
    expect(query().params).toEqual(["guessed", "attached"]);
    expect(query().sql).toContain('"saves"."deleted_at" is null');
    expect(query().sql).toContain('"saves"."id" in (?)');
  });
  it("keeps the selected folder constraint when the model requests another folder", async () => {
    await searchLibrary(
      { folderId: "model-folder" },
      { folderId: "selected-folder" },
    );
    expect(mock.retrieve).toHaveBeenCalledExactlyOnceWith(
      { folderId: "model-folder" },
      { folderId: "selected-folder" },
    );
  });
});

it("accepts media constraints separately from the lexical query", () => {
  expect(
    searchLibraryInput.parse({ query: "Kanye", media: ["image"] }),
  ).toEqual({ query: "Kanye", media: ["image"] });
});
