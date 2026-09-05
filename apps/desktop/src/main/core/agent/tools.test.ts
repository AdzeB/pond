import { convertSchemaToJsonSchema } from "@tanstack/ai";
import { SQLiteSyncDialect } from "drizzle-orm/sqlite-core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  assistantProposalInput,
  assistantQuestion,
  assistantResultSet,
} from "../../../shared/assistant";
import { IPC } from "../../../shared/constants";
import {
  applyFilter,
  applyFilterInput,
  citeSavesInput,
  describeSavesInput,
  grepLibrary,
  grepLibraryInput,
  libraryOverviewInput,
  listFoldersInput,
  openSaveInput,
  readSave,
  readSaveInput,
  searchLibrary,
  searchLibraryInput,
  setOverlay,
  setOverlayInput,
} from "./tools";

const mock = vi.hoisted(() => ({
  where: vi.fn(),
  retrieve: vi.fn().mockResolvedValue({ saves: [], hits: [] }),
  fts: vi.fn().mockReturnValue([]),
  admitted: [] as Array<{ id: string }>,
}));
vi.mock("../../db", () => ({
  getDb: async () => ({
    select: () => ({
      from: () => ({
        where: (condition: unknown) => {
          mock.where(condition);
          return Object.assign(Promise.resolve(mock.admitted), {
            limit: async () => [],
            orderBy: () => ({ limit: async () => [] }),
          });
        },
      }),
    }),
    $raw: {
      prepare: () => ({
        all: (...args: unknown[]) => mock.fts(...args),
      }),
    },
  }),
}));
vi.mock("../../lib/broadcast", () => ({ broadcast: vi.fn() }));
vi.mock("../library-retrieval", async (original) => ({
  ...(await original<typeof import("../library-retrieval")>()),
  retrieveLibrary: mock.retrieve,
}));
vi.mock("../folders", () => ({
  listFolders: async () => [],
  folderIdsForSave: async () => [],
}));
const dialect = new SQLiteSyncDialect();
const query = () => dialect.sqlToQuery(mock.where.mock.calls[0]?.[0]);
beforeEach(() => {
  vi.clearAllMocks();
  mock.admitted = [];
  mock.fts.mockReturnValue([]);
});

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

it("accepts a visual probe on search input", () => {
  expect(
    searchLibraryInput.parse({
      visual: { kind: "saveId", id: "save" },
    }),
  ).toMatchObject({ visual: { kind: "saveId", id: "save" } });
});

it("returns OCR snippets from library grep", async () => {
  mock.fts.mockReturnValue([
    {
      id: "save",
      title: "",
      description: "",
      caption: "",
      ocr: "invoice 441",
      transcript: "",
      notes: "",
    },
  ]);
  mock.admitted = [{ id: "save" }];
  expect(await grepLibrary({ query: "invoice" })).toEqual({
    hits: [{ id: "save", snippets: ["invoice 441"] }],
  });
});

function untypedSchemaPaths(schema: unknown, path = "$"): string[] {
  if (schema === true || schema === false) return [`${path}`];
  if (!schema || typeof schema !== "object") return [];
  if (Array.isArray(schema)) {
    return schema.flatMap((entry, index) =>
      untypedSchemaPaths(entry, `${path}[${index}]`),
    );
  }
  const node = schema as Record<string, unknown>;
  const keys = Object.keys(node).filter((key) => key !== "$schema");
  const typed =
    typeof node.type === "string" ||
    Array.isArray(node.type) ||
    node.const !== undefined ||
    node.enum !== undefined ||
    node.anyOf !== undefined ||
    node.oneOf !== undefined ||
    node.allOf !== undefined ||
    typeof node.$ref === "string";
  const hits = !typed && keys.length === 0 ? [path] : [];
  for (const [key, value] of Object.entries(node)) {
    if (key === "$schema" || key === "$ref") continue;
    if (key === "properties" && value && typeof value === "object") {
      for (const [name, property] of Object.entries(
        value as Record<string, unknown>,
      )) {
        hits.push(
          ...untypedSchemaPaths(property, `${path}.properties.${name}`),
        );
      }
      continue;
    }
    if (key === "additionalProperties") {
      hits.push(...untypedSchemaPaths(value, `${path}.additionalProperties`));
      continue;
    }
    hits.push(...untypedSchemaPaths(value, `${path}.${key}`));
  }
  return hits;
}

it("converts Agent tool inputs to JSON Schema providers can type-check", () => {
  const schemas = {
    showSaves: assistantResultSet,
    requestQuestion: assistantQuestion,
    searchLibrary: searchLibraryInput,
    readSave: readSaveInput,
    grepLibrary: grepLibraryInput,
    libraryOverview: libraryOverviewInput,
    applyFilter: applyFilterInput,
    setOverlay: setOverlayInput,
    citeSaves: citeSavesInput,
    openSave: openSaveInput,
    findDuplicates: listFoldersInput,
    describeSaves: describeSavesInput,
    listFolders: listFoldersInput,
    proposeChanges: assistantProposalInput,
  };
  const failures = Object.entries(schemas).flatMap(([name, schema]) => {
    const json = convertSchemaToJsonSchema(schema);
    return untypedSchemaPaths(json).map((path) => `${name}: ${path}`);
  });
  expect(failures).toEqual([]);
});

it("broadcasts applyFilter and setOverlay for the Library grid", async () => {
  const { broadcast } = await import("../../lib/broadcast");
  const query = {
    combinator: "and" as const,
    rules: [
      { field: "type" as const, operator: "eq" as const, value: "image" },
    ],
  };
  await applyFilter({ query });
  expect(broadcast).toHaveBeenCalledWith(IPC.agentFilter, query);
  await setOverlay({ semanticQuery: "black cat", visualSaveId: "save" });
  expect(broadcast).toHaveBeenCalledWith(IPC.agentOverlay, {
    semanticQuery: "black cat",
    visualSaveId: "save",
  });
});
